import 'colors'
import * as fs from 'fs'
import * as rollup from 'rollup'
import * as yauzl from 'yauzl'

import zip from 'rollup-plugin-zip'
import type { IPluginOptions } from 'rollup-plugin-zip'


const PACKAGE_NAME     = 'test'
const PACKAGE_VERSION  = '1.0'
const DEFAULT_FILENAME = `${PACKAGE_NAME}-${PACKAGE_VERSION}.zip`


process.env.npm_package_name    = PACKAGE_NAME
process.env.npm_package_version = PACKAGE_VERSION

interface IBuildPars {
  dir: string,
  options?: IPluginOptions,
}

const build = async ({
  dir,
  options,
}: IBuildPars): Promise<void> => {
  const bundle = await rollup.rollup({
    input: [
      `test/src/bar.js`,
      `test/src/baz.js`,
    ],
    plugins: [
      zip(options),
    ],
  })
  await bundle.write({
    chunkFileNames: '[name].js',
    dir: `test/dist/${dir}`,
    format: 'es',
    sourcemap: true,
  })
}

const promisedOpen = (
  path: string,
): Promise<yauzl.ZipFile> => new Promise((resolve, reject) => {
  yauzl.open(path, {lazyEntries: true, autoClose: true}, (err, zipfile) => {
    if (err || !zipfile) {
      return reject(err)
    }
    resolve(zipfile)
  })
})

const promisedReadEntries = (
  zipfile: yauzl.ZipFile,
): Promise<void> => new Promise((resolve, reject) => {
  const jsEntries = [
    'foo.js',
    'bar.js',
    'baz.js',
  ]
  const expectedEntries = new Set([
    ...jsEntries,
    ...jsEntries.map(e => e + '.map'),
  ])
  zipfile.readEntry()
  zipfile.on('entry', ({fileName: entryname}: {fileName: string}) => {
    if (expectedEntries.has(entryname)) {
      expectedEntries.delete(entryname)
    } else {
      throw new Error(`unexpected zip entry: "${entryname}"`)
    }
    zipfile.readEntry()
  })
  zipfile.on('end', () => {
    if (expectedEntries.size === 0) {
      resolve()
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      reject(new Error(`not all expected entries are presented in the zip file: [${[...expectedEntries]}]`))
    }
  })
})

let ERROR_COUNT = 0

const testCase = async (
  title: string,
  options: IBuildPars,
  filename: string,
): Promise<void> => {
  title = `Testing ${title}`
  console.info(title)
  try {
    await build(options)
    if (!fs.existsSync(filename)) {
      throw new Error(`expected the file to exist: "${filename}"`)
    }
    const zipfile = await promisedOpen(filename)
    await promisedReadEntries(zipfile)
    console.info(`${title} - ${'Success'.green}`)
  } catch (error) {
    ERROR_COUNT += 1
    console.error(`${title} - ${(error as Error).message.red}`)
  }
}

void Promise.all([
  testCase(
    'without options',
    {
      dir: 'nooptions'
    },
    `test/dist/nooptions/${DEFAULT_FILENAME}`,
  ),

  testCase(
    'with defined file name',
    {
      dir: 'file',
      options: {
        file: 'bundle.zip'
      }
    },
    'test/dist/file/bundle.zip',
  ),

  testCase(
    'with defined directory name',
    {
      dir: 'dir',
      options: {
        dir: `test/dist/dir/output`,
      },
    },
    `test/dist/dir/output/${DEFAULT_FILENAME}`,
  ),

]).then(() => {
  if (ERROR_COUNT === 0) {
    console.info('All tests passed'.green)
  } else {
    console.error(`${ERROR_COUNT} test(s) failed`.red)
    process.exit(1)
  }
})
