import debug from 'debug'

/**
 * @param {string} namespace
 * @returns {(formatter: any, ...args: any[])=>void}
 */
export function createLog(namespace) {
  return debug(`gat:${namespace}`)
}
