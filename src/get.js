import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import { download } from './download.js'
import { extract } from './extract.js'
import { createLog } from './log.js'
import {
  createToolBasename,
  getArchiveType,
  getDownloadUrl,
  tools,
} from './tools.js'

/**
 * @type {typeof import('./index.js').getTool}
 */
export async function getTool({
  tool,
  version,
  destinationFolderPath,
  platform = process.platform,
  arch = process.arch,
  force = false,
}) {
  const log = createLog('getTool')

  const url = getDownloadUrl({
    tool,
    version,
    platform,
    arch,
  })

  /** @type {(()=>Promise<void>)|undefined} */
  let toCleanupOnError

  const basename = createToolBasename({ tool, platform })
  const destinationPath = path.join(destinationFolderPath, basename)
  const flags = force
    ? // opens for write truncates the files
      'w'
    : // creates the file on open fails when already exists
      'wx'
  const mode = 511 // decimal equivalent of '0o777'

  try {
    const destinationFd = await fs.open(destinationPath, flags, mode)
    if (!force) {
      toCleanupOnError = () => fs.unlink(destinationPath)
    }
    const destination = destinationFd.createWriteStream()

    const buffer = await download({ url })

    const archiveType = getArchiveType({ tool, platform })
    const extractResult = await extract({ buffer, archiveType })

    const sourcePath = path.join(extractResult.destinationPath, basename)
    const source = createReadStream(sourcePath)

    try {
      await pipeline(source, destination)
      toCleanupOnError = undefined
    } finally {
      await extractResult.cleanup()
    }

    return { toolPath: destinationPath }
  } catch (err) {
    const errMessage = `Failed to download from ${url}${
      err.message ? ` ${err.message}` : ''
    }`
    log(errMessage, err)
    if (err.code === 'EEXIST' && !force) {
      const eexistMessage = `Tool already exists: ${destinationPath}. Use --force to overwrite.`
      log(eexistMessage)
      throw new Error(eexistMessage)
    }
    throw new Error(errMessage)
  } finally {
    await toCleanupOnError?.()
  }
}

export { tools }
