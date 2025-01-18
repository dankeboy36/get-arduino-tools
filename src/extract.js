import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import decompress from '@xhmikosr/decompress'

import { createLog } from './log.js'
import { rm } from './rm.js'

/**
 * @typedef {Object} ExtractParams
 * @property {Uint8Array<ArrayBufferLike>} buffer
 *
 * @typedef {Object} ExtractResult
 * @property {string} destinationPath
 * @property {()=>Promise<void>} dispose
 *
 * @param {ExtractParams} params
 * @returns {Promise<ExtractResult>}
 */
export async function extract({ buffer }) {
  const log = createLog('extract')

  const destinationPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gat-'))
  log('Extracting to', destinationPath)
  try {
    await decompress(buffer, destinationPath)
  } catch (err) {
    log('Error extracting to', destinationPath, err)
    try {
      await rm(destinationPath)
    } catch {}
    throw err
  }
  log('Extracted to', destinationPath)
  return {
    destinationPath,
    dispose: () => rm(destinationPath),
  }
}
