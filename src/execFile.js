import cp from 'node:child_process'
import { promisify } from 'node:util'

import { createLog } from './log.js'

/**
 * @param {string} file
 * @param {readonly string[]} args
 */
export async function execFile(file, args) {
  const log = createLog('execFile')

  log(`execFile: ${file} ${args.join(' ')}`)
  const { stdout } = await promisify(cp.execFile)(file, args)
  return stdout.trim()
}
