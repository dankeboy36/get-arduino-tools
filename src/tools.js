import { posix } from 'node:path'

import { createLog } from './log.js'

const arduinoTools = /** @type {const} */ ([
  'arduino-cli',
  'arduino-language-server',
  'arduino-fwuploader',
])
const clangTools = /** @type {const} */ (['clangd', 'clang-format'])
export const tools = /** @type {const} */ ([...arduinoTools, ...clangTools])

export function isArduinoTool(tool) {
  return arduinoTools.includes(tool)
}

/**
 * @typedef {typeof tools[number]} Tool
 *
 * @typedef {Object} GetDownloadUrlParams
 * @property {Tool} tool
 * @property {string} version
 * @property {NodeJS.Platform} platform
 * @property {NodeJS.Architecture} arch
 *
 * @param {GetDownloadUrlParams} params
 * @returns {string}
 */
export function getDownloadUrl({ tool, version, platform, arch }) {
  const log = createLog('tools')

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
  downloadUrl.pathname = posix.join(category, remoteFilename)
  const url = downloadUrl.toString()
  log('URL', url)

  return url
}

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

function getArchiveExtension({ tool, platform }) {
  const clang = clangTools.includes(tool)
  switch (platform) {
    case 'win32':
      return '.zip'
    default:
      return `.tar${clang ? '.bz2' : '.gz'}`
  }
}
