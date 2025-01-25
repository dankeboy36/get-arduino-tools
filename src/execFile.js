import cp from 'node:child_process'
import { promisify } from 'node:util'

import { createLog } from './log.js'

const execFileAsync = promisify(cp.execFile)

/**
 * @param {string} file
 * @param {readonly string[]} [args=[]]
 * @param {boolean} [canError=false]
 */
export async function execFile(file, args = [], canError = false) {
  const log = createLog('execFile')

  log(`execFile: ${file} ${args.join(' ')}`)
  try {
    const { stdout } = await execFileAsync(file, args)
    return stdout.trim()
  } catch (err) {
    if (canError && 'stderr' in err) {
      return err.stderr.trim()
    }
    throw err
  }
}
