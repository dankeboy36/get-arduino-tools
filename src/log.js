import debug from 'debug'

/**
 * @param {string} namespace
 * @returns {(formatter: any, ...args: any[]) => void}
 */
export function createLog(namespace) {
  return debug.debug(`gat:${namespace}`)
}

export default {
  createLog,
}
