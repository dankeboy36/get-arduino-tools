const xhr = require('request-light')

const { createLog } = require('./log')

/**
 * @typedef {Object} DownloadParams
 * @property {string} url
 *
 * @param {DownloadParams} params
 * @returns {Promise<Uint8Array<ArrayBufferLike>>}
 */
async function download({ url }) {
  const log = createLog('download')

  log('Downloading', url)
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

module.exports = {
  download,
}
