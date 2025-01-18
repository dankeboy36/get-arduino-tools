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
  const { stdout, stderr } = await promisify(cp.execFile)(file, args)
  if (stderr) {
    log('unexpected stderr', stderr)
    throw new Error(stderr)
  }
  log('stdout', stdout)
  return stdout.trim()
}
