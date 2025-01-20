import { createLog } from './log.js'

const clangTools = /** @type {const} */ (['clangd', 'clangd-format'])

export const tools = /** @type {const} */ ([
  'arduino-cli',
  'arduino-language-server',
  'arduino-fwuploader',
  ...clangTools,
])

/**
 * @typedef {typeof tools[number]} Tool
 *
 * @typedef {Object} ToolDescription
 * @property {Tool} tool
 * @property {string} url
 *
 * @typedef {Object} GetToolDescriptionParams
 * @property {Tool} tool
 * @property {string} version
 * @property {NodeJS.Platform} platform
 * @property {NodeJS.Architecture} arch
 *
 * @param {GetToolDescriptionParams} params
 * @returns {ToolDescription}
 */
export function getToolDescription({ tool, version, platform, arch }) {
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

  const isClang = clangTools.includes(tool)
  const url = `https://downloads.arduino.cc/${
    isClang ? 'tools' : tool
  }/${remoteFilename}`
  log('URL', url)

  const toolDescription = { tool, url }

  log('Tool description', JSON.stringify(toolDescription))

  return toolDescription
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
