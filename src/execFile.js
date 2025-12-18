import cp from 'node:child_process'
import util from 'node:util'

import logModule from './log.js'

/**
 * @param {string} file
 * @param {readonly string[]} [args=[]] Default is `[]`
 * @param {boolean} [canError=false] Default is `false`
 */
export async function execFile(file, args = [], canError = false) {
  const log = logModule.createLog('execFile')

  log(`execFile: ${file} ${args.join(' ')}`)
  try {
    const execFileAsync = util.promisify(cp.execFile)
    const { stdout } = await execFileAsync(file, args)
    return stdout.trim()
  } catch (err) {
    if (
      canError &&
      err instanceof Error &&
      'stderr' in err &&
      typeof err.stderr === 'string'
    ) {
      return err.stderr.trim()
    }
    throw err
  }
}

export default {
  execFile,
}
