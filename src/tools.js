import path from 'node:path'

import logModule from './log.js'

/**
 * @typedef {import('./index.js').Tool} Tool
 *
 * @typedef {import('./index.js').ArduinoTool} ArduinoTool
 */

const arduinoTools = /** @type {const} */ ([
  'arduino-cli',
  'arduino-language-server',
  'arduino-fwuploader',
  'arduino-lint',
])
const clangTools = /** @type {const} */ (['clangd', 'clang-format'])
const tools = /** @type {readonly Tool[]} */ ([...arduinoTools, ...clangTools])

/**
 * @param {Tool} tool
 * @returns {tool is ArduinoTool}
 */
export function isArduinoTool(tool) {
  return arduinoTools.includes(/** @type {any} */ (tool))
}

/**
 * @param {{ tool: Tool; platform: NodeJS.Platform }} params
 * @returns String
 */
export function createToolBasename({ tool, platform }) {
  return `${tool}${platform === 'win32' ? '.exe' : ''}`
}

/**
 * @typedef {Object} GetDownloadUrlParams
 * @property {Tool} tool
 * @property {string} version
 * @property {NodeJS.Platform} platform
 * @property {NodeJS.Architecture} arch
 * @property {AbortSignal} [signal]
 * @param {GetDownloadUrlParams} params
 * @returns {string}
 */
export function getDownloadUrl({ tool, version, platform, arch }) {
  const log = logModule.createLog('getDownloadUrl')

  log('Getting tool name for', tool, version, platform, arch)
  if (!tools.includes(tool)) {
    throw new Error(`Unsupported tool: ${tool}`)
  }

  const suffix = getToolSuffix({ platform, arch })
  log('Tool suffix', suffix)

  const ext = getArchiveExtension({ tool, platform })
  log('Archive extension', ext)

  const remoteFilename = `${tool}_${version}_${suffix}${ext}`
  log('Remove filename', remoteFilename)

  const downloadUrl = new URL('https://downloads.arduino.cc')
  const category = isArduinoTool(tool) ? tool : 'tools'
  downloadUrl.pathname = path.posix.join(category, remoteFilename)
  const url = downloadUrl.toString()
  log('URL', url)

  return url
}

/** @param {{ platform: NodeJS.Platform; arch: NodeJS.Architecture }} params */
function getToolSuffix({ platform, arch }) {
  if (platform === 'darwin') {
    if (arch === 'arm64') {
      return 'macOS_ARM64'
    }
    return 'macOS_64bit'
  } else if (platform === 'linux') {
    switch (arch) {
      case 'arm64':
        return 'Linux_ARM64'
      case 'x64':
        return 'Linux_64bit'
      case 'arm':
        return 'Linux_ARMv7'
    }
  } else if (platform === 'win32') {
    return 'Windows_64bit'
  }
  throw new Error(`Unsupported platform: ${platform}, arch: ${arch}`)
}

/** @typedef {'zip' | 'gzip' | 'bzip2'} ArchiveType */

/** @type {Record<ArchiveType, string>} */
const extMapping = {
  zip: '.zip',
  gzip: '.tar.gz',
  bzip2: '.tar.bz2',
}

/**
 * @param {{ tool: Tool; platform: NodeJS.Platform }} params
 * @returns {ArchiveType}
 */
export function getArchiveType({ tool, platform }) {
  if (!isArduinoTool(tool)) {
    return 'bzip2'
  }
  switch (platform) {
    case 'win32':
      return 'zip'
    default:
      return 'gzip'
  }
}

/** @param {{ tool: Tool; platform: NodeJS.Platform }} params */
function getArchiveExtension({ tool, platform }) {
  return extMapping[getArchiveType({ tool, platform })]
}

export { tools }

export default {
  tools,
  isArduinoTool,
  createToolBasename,
  getDownloadUrl,
  getArchiveType,
}
