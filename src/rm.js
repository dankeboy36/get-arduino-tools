import fs from 'node:fs/promises'

import { createLog } from './log.js'

/**
 * @param {import('fs').PathLike} path
 */
export function rm(path) {
  const log = createLog('rm')

  log('Deleting', path)
  return fs.rm(path, { recursive: true, force: true, maxRetries: 3 }).then(
    () => log('Deleted', path),
    (err) => log('Error deleting', path, err)
  )
}
