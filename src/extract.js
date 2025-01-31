const { createWriteStream } = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')
const { Readable, Transform } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const zlib = require('node:zlib')

const tar = require('tar-stream')
const tmp = require('tmp-promise')
const bz2 = require('unbzip2-stream')
const unzip = require('unzip-stream')

const { createLog } = require('./log')

/**
 * @typedef {Object} ExtractParams
 * @property {Readable} source
 * @property {import('./tools').ArchiveType} archiveType
 *
 * @typedef {Object} ExtractResult
 * @property {string} destinationPath
 * @property {()=>Promise<void>} cleanup
 *
 * @param {ExtractParams} params
 * @returns {Promise<ExtractResult>}
 */
async function extract({ source, archiveType }) {
  const log = createLog('extract')

  const { path: destinationPath, cleanup } = await tmp.dir({
    prefix: 'gat-',
    keep: false,
    tries: 3,
    unsafeCleanup: true,
  })
  log('Extracting to', destinationPath, 'with', archiveType)

  try {
    switch (archiveType) {
      case 'gzip': {
        await extractGzipTar({ source, destinationPath })
        break
      }
      case 'bzip2': {
        await extractBzip2Tar({ source, destinationPath })
        break
      }
      case 'zip': {
        await extractZip({ source, destinationPath })
        break
      }
      default: {
        throw new Error(`Unsupported archive type: ${archiveType}`)
      }
    }
  } catch (err) {
    log('Error extracting to', destinationPath, err)
    try {
      await cleanup()
    } catch {}
    throw err
  }
  log('Extracted to', destinationPath)
  return {
    destinationPath,
    cleanup,
  }
}

async function extractZip({ source, destinationPath }) {
  const log = createLog('extractZip')

  const transformEntry = new Transform({
    objectMode: true,
    transform: async (entry, _, next) => {
      const entryPath = entry.path
      const destinationFilePath = path.join(destinationPath, entryPath)
      log('extracting', destinationFilePath)
      await pipeline(entry, createWriteStream(destinationFilePath))
      next()
    },
  })

  await pipeline(source, unzip.Parse(), transformEntry)

  log('extracting to ', destinationPath)
}

async function extractGzipTar({ source, destinationPath }) {
  const log = createLog('extractGzipTar')
  return extractTar({
    source,
    decompress: zlib.createGunzip(),
    destinationPath,
    log,
  })
}

async function extractBzip2Tar({ source, destinationPath }) {
  const log = createLog('extractBzip2Tar')
  return extractTar({
    source,
    decompress: bz2(),
    destinationPath,
    log,
    strip: 1, // non-Arduino tools have a parent folder
  })
}

async function extractTar({
  source,
  decompress,
  destinationPath,
  log,
  strip = 0,
}) {
  log('extracting to ', destinationPath)

  const extract = tar.extract()

  extract.on('entry', (header, stream, next) => {
    if (header.type === 'directory') {
      stream.resume()
      stream.on('end', next)
      return
    }
    let basename = header.name
    if (strip > 0) {
      // the path is always POSIX inside the tar. For example, "folder/fake-tool"
      const parts = basename.split(path.posix.sep).slice(strip)
      basename = parts.length ? parts.join(path.sep) : basename
    }
    const destinationFilePath = path.join(destinationPath, basename)
    fs.mkdir(path.dirname(destinationFilePath), { recursive: true })
      .then(() => {
        log('extracting', destinationFilePath)
        return pipeline(stream, createWriteStream(destinationFilePath))
      })
      .then(() => next())
      .catch(next)
  })

  await pipeline(source, decompress, extract)
  log('extracted to', destinationPath)
}

module.exports = {
  extract,
}
