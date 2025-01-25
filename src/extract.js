import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import zlib from 'node:zlib'

import tar from 'tar-stream'
import bz2 from 'unbzip2-stream'
import unzip from 'unzip-stream'

import { createLog } from './log.js'
import { rm } from './rm.js'

/**
 * @typedef {Object} ExtractParams
 * @property {Uint8Array<ArrayBufferLike>} buffer
 * @property {import('./tools.js').ArchiveType} archiveType
 *
 * @typedef {Object} ExtractResult
 * @property {string} destinationPath
 * @property {()=>Promise<void>} dispose
 *
 * @param {ExtractParams} params
 * @returns {Promise<ExtractResult>}
 */
export async function extract({ buffer, archiveType }) {
  const log = createLog('extract')

  const destinationFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gat-')) // TODO: switch to `tmp-promise` with built-in cleanup
  log('Extracting to', destinationFolderPath, 'with', archiveType)

  const source = Readable.from(buffer)

  try {
    switch (archiveType) {
      case 'gzip': {
        await extractGzipTar({ source, destinationFolderPath })
        break
      }
      case 'bzip2': {
        await extractBzip2Tar({ source, destinationFolderPath })
        break
      }
      case 'zip': {
        await extractZip({ source, destinationFolderPath })
        break
      }
      default: {
        throw new Error(`Unsupported archive type: ${archiveType}`)
      }
    }
  } catch (err) {
    log('Error extracting to', destinationFolderPath, err)
    try {
      await rm(destinationFolderPath)
    } catch {}
    throw err
  }
  log('Extracted to', destinationFolderPath)
  return {
    destinationPath: destinationFolderPath,
    dispose: () => rm(destinationFolderPath),
  }
}

async function extractZip({ source, destinationFolderPath }) {
  const log = createLog('extractZip')

  const transformEntry = new Transform({
    objectMode: true,
    transform: async (entry, _, next) => {
      const entryPath = entry.path
      const destinationFilePath = path.join(destinationFolderPath, entryPath)
      log('extracting', destinationFilePath)
      await pipeline(entry, createWriteStream(destinationFilePath))
      next()
    },
  })

  await pipeline(source, unzip.Parse(), transformEntry)

  log('extracting to ', destinationFolderPath)
}

async function extractGzipTar({ source, destinationFolderPath }) {
  const log = createLog('extractGzipTar')
  return extractTar({
    source,
    decompress: zlib.createGunzip(),
    destinationFolderPath,
    log,
  })
}

async function extractBzip2Tar({ source, destinationFolderPath }) {
  const log = createLog('extractBzip2Tar')
  return extractTar({
    source,
    decompress: bz2(),
    destinationFolderPath,
    log,
    strip: 1, // non-Arduino tools have a parent folder
  })
}

async function extractTar({
  source,
  decompress,
  destinationFolderPath,
  log,
  strip = 0,
}) {
  log('extracting to ', destinationFolderPath)

  const extract = tar.extract()

  extract.on('entry', (header, stream, next) => {
    if (header.type === 'directory') {
      stream.resume()
      stream.on('end', next)
      return
    }
    let basename = header.name
    if (strip > 0) {
      const parts = basename.split(path.sep).slice(strip)
      basename = parts.length ? parts.join(path.sep) : basename
    }
    const destinationFilePath = path.join(destinationFolderPath, basename)
    fs.mkdir(path.dirname(destinationFilePath), { recursive: true })
      .then(() => {
        log('extracting', destinationFilePath)
        return pipeline(stream, createWriteStream(destinationFilePath))
      })
      .then(() => next())
      .catch(next)
  })

  await pipeline(source, decompress, extract)
  log('extracted to', destinationFolderPath)
}
