import * as fs from 'fs'
import * as path from 'path'
import {OutputAsset, OutputChunk, Plugin} from 'rollup'
import {ZipFile} from 'yazl'


const isAsset = (entry: OutputAsset | OutputChunk): entry is OutputAsset => (
  entry.type === 'asset'
)

export interface IPluginOptions {
  file?: string
  dir?: string
}

type RollupPluginZip = (options?: IPluginOptions) => Plugin

const enum Cache {
  distdir = 'distdir',
  outfile = 'outfile',
  sourcemapFile = 'sourcemapFile',
}
var cache = new Map();
export const zip: RollupPluginZip = (options) => ({
  name: 'zip',

  generateBundle({dir, sourcemap, sourcemapFile}): void {
    // Save the output directory path
    let distDir = process.cwd()
    if (dir) {
      distDir = path.resolve(distDir, dir)
    }
    cache.set(Cache.distdir, distDir)
    if (sourcemap) {
      cache.set(Cache.sourcemapFile, sourcemapFile)
    }
    // Get options
    let outFile  = options?.file
    const outDir = options?.dir
    if (outFile) {
      if (outDir) {
        this.warn('Both the `file` and `dir` options are set - `dir` has no effect')
      }
      if (!path.isAbsolute(outFile)) {
        outFile = path.resolve(distDir, outFile)
      }
    } else {
      const {
        npm_package_name: packageName = 'bundle',
        npm_package_version: packageVersion
      } = process.env
      outFile = packageName
      if (packageVersion) {
        outFile += '-' + packageVersion
      }
      if (outDir && !(fs.existsSync(outDir) && fs.statSync(outDir).isDirectory())) {
        fs.mkdirSync(outDir, {recursive: true})
      }
      outFile = path.resolve(outDir || distDir, outFile + '.zip')
    }
    // Save the output file path
    cache.set(Cache.outfile, outFile)
  },

  writeBundle(_options, bundle): Promise<void> {
    return new Promise(resolve => {
      const distDir = cache.get(Cache.distdir)
      const sourcemapFile = cache.get(Cache.sourcemapFile)
      const zipFile = new ZipFile()
      Object.entries(bundle).forEach(([, entry]) => {
        if (isAsset(entry)) {
          const {fileName, source} = entry
          const buffer = Buffer.from(source)
          zipFile.addBuffer(buffer, fileName)
        } else {
          const {fileName, map} = entry
          zipFile.addFile(path.resolve(distDir, fileName), fileName)
          if (map) {
            const mapFile = fileName + '.map'
            zipFile.addFile(path.resolve(distDir, mapFile), mapFile)
          }
        }
      })
      if (sourcemapFile) {
        zipFile.addFile(path.resolve(distDir, sourcemapFile), sourcemapFile)
      }
      const outFile = cache.get(Cache.outfile)
      const writeStream = fs.createWriteStream(outFile)
      zipFile.outputStream.pipe(writeStream)
      zipFile.end()
      writeStream.on('close', resolve)
    })
  },
})

export default zip
