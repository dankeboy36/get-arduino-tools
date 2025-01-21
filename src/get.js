import fs, { constants } from 'node:fs/promises'
import path from 'node:path'

import { download } from './download.js'
import { extract } from './extract.js'
import { createLog } from './log.js'
import { getDownloadUrl, isArduinoTool, tools } from './tools.js'

/**
 * @typedef {Object} GetToolParams
 * @property {import('./tools.js').Tool} tool
 * @property {string} version
 * @property {string} destinationFolderPath
 * @property {NodeJS.Platform} [platform=process.platform]
 * @property {NodeJS.Architecture} [arch=process.arch]
 * @property {boolean} [force=false]
 *
 * @typedef {Object} GetToolResult
 * @property {string} toolPath
 *
 * @param {GetToolParams} params
 * @returns {Promise<GetToolResult>}
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

  /** @type {Uint8Array<ArrayBufferLike>|undefined} */
  let buffer
  try {
    buffer = await download({ url })
  } catch (err) {
    log(`Failed to download from ${url}`, err)
  }
  if (!buffer) {
    throw new Error(`Failed to download from ${url}`)
  }

  const strip = isArduinoTool(tool) ? undefined : 1 // clangd and clang-format are in a folder inside the archive
  const extractResult = await extract({ buffer, strip })

  try {
    const basename = `${tool}${platform === 'win32' ? '.exe' : ''}`
    const sourcePath = path.join(extractResult.destinationPath, basename)
    const destinationPath = path.join(destinationFolderPath, basename)

    await copy(sourcePath, destinationPath, force, log)

    return { toolPath: destinationPath }
  } finally {
    await extractResult.dispose()
  }
}

/**
 *
 * @param {string} sourcePath
 * @param {string} destinationPath
 * @param {boolean} force
 * @param {ReturnType<createLog>} log
 */
async function copy(sourcePath, destinationPath, force, log) {
  log('Copying', sourcePath, 'to', destinationPath, 'with force', force)
  const mode = force ? undefined : constants.COPYFILE_EXCL
  try {
    await fs.copyFile(sourcePath, destinationPath, mode)
  } catch (err) {
    if (err.code === 'EEXIST' && !force) {
      const eexistMessage = `Tool already exists: ${destinationPath}. Use --force to overwrite.`
      log(eexistMessage)
      throw new Error(eexistMessage)
    }
    throw err
  }
  log('Copied')
}

export { tools }
