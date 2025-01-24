import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import { download } from './download.js'
import { extract } from './extract.js'
import { createLog } from './log.js'
import { rm } from './rm.js'
import { getDownloadUrl, isArduinoTool, tools } from './tools.js'

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
  let toCleanup

  const basename = `${tool}${platform === 'win32' ? '.exe' : ''}`
  const destinationPath = path.join(destinationFolderPath, basename)
  const flags = force ? 'w' : 'wx'

  try {
    const destinationFd = await fs.open(destinationPath, flags)
    if (!force) {
      toCleanup = () => rm(destinationPath)
    }
    const destination = destinationFd.createWriteStream()

    const buffer = await download({ url })

    const strip = isArduinoTool(tool) ? undefined : 1 // clangd and clang-format are in a folder inside the archive
    const extractResult = await extract({ buffer, strip })

    const sourcePath = path.join(extractResult.destinationPath, basename)
    const source = createReadStream(sourcePath)

    try {
      await pipeline(source, destination)
      toCleanup = undefined
    } finally {
      await extractResult.dispose()
    }

    return { toolPath: destinationPath }
  } catch (err) {
    const errMessage = `Failed to download from ${url}`
    log(errMessage, err)
    if (err.code === 'EEXIST' && !force) {
      const eexistMessage = `Tool already exists: ${destinationPath}. Use --force to overwrite.`
      log(eexistMessage)
      throw new Error(eexistMessage)
    }
    throw new Error(errMessage)
  } finally {
    await toCleanup?.()
  }
}

export { tools }
