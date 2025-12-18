import stream from 'node:stream'

import xhr from 'request-light-stream'
import vscodeJsonrpc from 'vscode-jsonrpc'

import logModule from './log.js'

const { Readable } = stream
const { CancellationTokenSource } = vscodeJsonrpc

/**
 * @typedef {Object} DownloadParams
 * @property {string} url
 * @property {AbortSignal} [signal]
 *
 * @typedef {Object} DownloadResult
 * @property {import('node:stream').Readable} body
 * @property {number} length
 * @param {DownloadParams} params
 * @returns {Promise<DownloadResult>}
 */
export async function download({ url, signal }) {
  const log = logModule.createLog('download')

  /** @type {xhr.CancellationToken | undefined} */
  let token
  if (signal) {
    const source = new CancellationTokenSource()
    token = source.token
    signal.addEventListener('abort', () => source.cancel())
  }

  log('Downloading', url)
  try {
    const { body, status, headers } = await xhr.xhr({
      url,
      responseType: 'stream',
      token,
    })
    if (status !== 200) {
      throw new Error(`Failed to download ${url}: unexpected status ${status}`)
    }
    if (!body) {
      throw new Error(`Failed to download ${url}: no body`)
    }
    log(`Downloaded ${url}`)

    const length = getContentLength(headers)
    return {
      // @ts-ignore
      body: createReadableFromWeb(body),
      length,
    }
  } catch (err) {
    log(
      `Error downloading ${url}: ${
        err instanceof Error ? err : JSON.stringify(err)
      }`
    )
    let message = String(err)
    if (err !== null && typeof err === 'object') {
      const anyErr = /** @type {any} */ (err)
      message =
        anyErr.responseText ||
        (anyErr.status ? xhr.getErrorStatusDescription(anyErr.status) : '') ||
        anyErr.toString()
    }

    throw new Error(`Failed to download ${url}: ${message}`, { cause: err })
  }
}

/** @param {import('request-light-stream').XHRResponse['headers']} [headers] */
function getContentLength(headers) {
  return (
    Object.entries(headers ?? {}).reduce(
      (/** @type {number[]} */ acc, [key, value]) => {
        if (key.toLowerCase() === 'content-length') {
          const lengthValue = Array.isArray(value) ? value[0] : value
          if (lengthValue) {
            const length = parseInt(lengthValue, 10)
            if (!Number.isNaN(length)) {
              acc.push(length)
            }
          }
        }
        return acc
      },
      []
    )[0] ?? 0
  )
}

/**
 * @param {import('node:stream/web').ReadableStream<Uint8Array<ArrayBuffer>>} body
 * @returns {import('node:stream').Readable}
 */
function createReadableFromWeb(body) {
  const reader = body.getReader()
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read()
        if (done) {
          this.push(null)
        } else {
          this.push(Buffer.from(value))
        }
      } catch (err) {
        this.destroy(err instanceof Error ? err : new Error(String(err)))
      }
    },
  })
}

export default {
  download,
}
