'use strict';

var fs = require('fs');
var path = require('path');
var yazl = require('yazl');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

const isAsset = (entry) => (entry.type === 'asset');
var cache = new Map();
const zip = (options) => ({
    name: 'zip',
    generateBundle({ dir, sourcemap, sourcemapFile }) {
        // Save the output directory path
        let distDir = process.cwd();
        if (dir) {
            distDir = path__namespace.resolve(distDir, dir);
        }
        cache.set("distdir" /* Cache.distdir */, distDir);
        if (sourcemap) {
            cache.set("sourcemapFile" /* Cache.sourcemapFile */, sourcemapFile);
        }
        // Get options
        let outFile = options === null || options === void 0 ? void 0 : options.file;
        const outDir = options === null || options === void 0 ? void 0 : options.dir;
        if (outFile) {
            if (outDir) {
                this.warn('Both the `file` and `dir` options are set - `dir` has no effect');
            }
            if (!path__namespace.isAbsolute(outFile)) {
                outFile = path__namespace.resolve(distDir, outFile);
            }
        }
        else {
            const { npm_package_name: packageName = 'bundle', npm_package_version: packageVersion } = process.env;
            outFile = packageName;
            if (packageVersion) {
                outFile += '-' + packageVersion;
            }
            if (outDir && !(fs__namespace.existsSync(outDir) && fs__namespace.statSync(outDir).isDirectory())) {
                fs__namespace.mkdirSync(outDir, { recursive: true });
            }
            outFile = path__namespace.resolve(outDir || distDir, outFile + '.zip');
        }
        // Save the output file path
        cache.set("outfile" /* Cache.outfile */, outFile);
    },
    writeBundle(_options, bundle) {
        return new Promise(resolve => {
            const distDir = cache.get("distdir" /* Cache.distdir */);
            const sourcemapFile = cache.get("sourcemapFile" /* Cache.sourcemapFile */);
            const zipFile = new yazl.ZipFile();
            Object.entries(bundle).forEach(([, entry]) => {
                if (isAsset(entry)) {
                    const { fileName, source } = entry;
                    const buffer = Buffer.from(source);
                    zipFile.addBuffer(buffer, fileName);
                }
                else {
                    const { fileName, map } = entry;
                    zipFile.addFile(path__namespace.resolve(distDir, fileName), fileName);
                    if (map) {
                        const mapFile = fileName + '.map';
                        zipFile.addFile(path__namespace.resolve(distDir, mapFile), mapFile);
                    }
                }
            });
            if (sourcemapFile) {
                zipFile.addFile(path__namespace.resolve(distDir, sourcemapFile), sourcemapFile);
            }
            const outFile = cache.get("outfile" /* Cache.outfile */);
            const writeStream = fs__namespace.createWriteStream(outFile);
            zipFile.outputStream.pipe(writeStream);
            zipFile.end();
            writeStream.on('close', resolve);
        });
    },
});

module.exports = zip;
