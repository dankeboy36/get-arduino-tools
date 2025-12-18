import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import stream from 'node:stream'
import streamPromises from 'node:stream/promises'
import zlib from 'node:zlib'

import tar from 'tar-stream'
import tmp from 'tmp-promise'
import bz2 from 'unbzip2-stream'
import unzip from 'unzip-stream'

import logModule from './log.js'

const { Transform } = stream

/**
 * @typedef {Object} ExtractParams
 * @property {import('node:stream').Readable} source
 * @property {import('./tools.js').ArchiveType} archiveType
 * @property {import('./progress.js').ProgressCounter} [counter]
 *
 * @typedef {Object} ExtractResult
 * @property {string} destinationPath
 * @property {() => Promise<void>} cleanup
 * @param {ExtractParams} params
 * @returns {Promise<ExtractResult>}
 */
export async function extract({ source, archiveType, counter }) {
  const log = logModule.createLog('extract')

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
        await extractGzipTar({ source, destinationPath, counter })
        break
      }
      case 'bzip2': {
        await extractBzip2Tar({ source, destinationPath, counter })
        break
      }
      case 'zip': {
        await extractZip({ source, destinationPath, counter })
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

/**
 * @typedef {Object} ExtractParams0
 * @property {import('node:stream').Readable} source
 * @property {string} destinationPath
 * @property {import('./progress.js').ProgressCounter} [counter]
 */

/** @param {ExtractParams0} params */
async function extractZip({ source, destinationPath, counter }) {
  const log = logModule.createLog('extractZip')

  const invalidEntries = []
  const transformEntry = new Transform({
    objectMode: true,
    transform: async (entry, _, next) => {
      counter?.onEnter(entry.size)
      const entryPath = entry.path
      // unzip-stream guards against `..` entry paths by converting them to `.`
      // https://github.com/mhr3/unzip-stream/commit/d5823009634ad448873ec984bed84c18ee92f9b5#diff-fda971882fda4a106029f88d4b0a6eebeb04e7847cae8516b332b5b57e7e3370R153-R154
      if (entryPath.split(path.sep).includes('.')) {
        log('invalid archive entry', entryPath)
        invalidEntries.push(entryPath)
        next()
        return
      }
      const destinationFilePath = path.join(destinationPath, entryPath)
      log('extracting', destinationFilePath)
      const transform = new Transform({
        transform: (chunk, _, next) => {
          counter?.onExtract(chunk.length)
          next(null, chunk)
        },
      })
      const destination = fsSync.createWriteStream(destinationFilePath)
      await streamPromises.pipeline(entry, transform, destination)

      next()
    },
  })

  await streamPromises.pipeline(source, unzip.Parse(), transformEntry)
  if (invalidEntries.length) {
    throw new Error('Invalid archive entry')
  }
  log('extracting to ', destinationPath)
}

/** @param {ExtractParams0} params */
async function extractGzipTar({ source, destinationPath, counter }) {
  const log = logModule.createLog('extractGzipTar')
  return extractTar({
    source,
    decompress: zlib.createGunzip(),
    destinationPath,
    log,
    counter,
  })
}

/** @param {ExtractParams0} params */
async function extractBzip2Tar({ source, destinationPath, counter }) {
  const log = logModule.createLog('extractBzip2Tar')
  return extractTar({
    source,
    decompress: bz2(),
    destinationPath,
    log,
    strip: 1, // non-Arduino tools have a parent folder
    counter,
  })
}

/**
 * @typedef {Object} ExtractTar
 * @property {number} [strip=0] Default is `0`
 * @property {ReturnType<typeof import('./log.js').createLog>} log
 * @property {import('node:stream').Transform} decompress
 */

/** @param {ExtractParams0 & ExtractTar} params */
async function extractTar({
  source,
  decompress,
  destinationPath,
  log,
  strip = 0,
  counter,
}) {
  log('extracting to ', destinationPath)

  const invalidEntries = []
  const extract = tar.extract()

  extract.on('entry', (header, stream, next) => {
    if (header.type === 'directory') {
      stream.resume()
      stream.on('end', next)
      return
    }

    if (header.size) {
      counter?.onEnter(header.size)
    }
    let entryPath = header.name
    if (strip > 0) {
      // the path is always POSIX inside the tar. For example, "folder/fake-tool"
      const parts = entryPath.split(path.posix.sep).slice(strip)
      entryPath = parts.length ? parts.join(path.sep) : entryPath
    }

    const destinationFilePath = path.join(destinationPath, entryPath)
    const resolvedPath = path.resolve(destinationFilePath)
    if (!resolvedPath.startsWith(path.resolve(destinationPath))) {
      log('invalid archive entry', entryPath)
      invalidEntries.push(entryPath)
      stream.resume()
      stream.on('end', next)
      return
    }

    fs.mkdir(path.dirname(destinationFilePath), { recursive: true })
      .then(() => {
        log('extracting', destinationFilePath)
        return streamPromises.pipeline(
          stream,
          new Transform({
            transform: (chunk, _, next) => {
              counter?.onExtract(chunk.length)
              next(null, chunk)
            },
          }),
          fsSync.createWriteStream(destinationFilePath)
        )
      })
      .then(() => next())
      .catch(next)
  })

  await streamPromises.pipeline(source, decompress, extract)
  if (invalidEntries.length) {
    throw new Error('Invalid archive entry')
  }
  log('extracted to', destinationPath)
}

export default {
  extract,
}
