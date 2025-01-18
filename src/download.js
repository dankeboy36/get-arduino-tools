import xhr from 'request-light'

import { createLog } from './log.js'

/**
 * @typedef {Object} DownloadParams
 * @property {import('./tools.js').Tool} tool
 * @property {string} remoteFilename
 *
 * @param {DownloadParams} params
 * @returns {Promise<Uint8Array<ArrayBufferLike>>}
 */
export async function download({ tool, remoteFilename }) {
  const log = createLog('download')

  log('Downloading', tool, remoteFilename)
  const url = `https://downloads.arduino.cc/${tool}/${remoteFilename}`
  log(`Downloading ${url}`)
  try {
    const { body } = await xhr.xhr({ url })
    log(`Downloaded ${url}`)
    return body
  } catch (err) {
    log(
      `Error downloading ${url}: ${
        err instanceof Error ? err : JSON.stringify(err)
      }`
    )
    throw new Error(
      err.responseText ||
        (err.status && xhr.getErrorStatusDescription(err.status)) ||
        err.toString()
    )
  }
}
