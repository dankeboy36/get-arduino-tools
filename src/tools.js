import { createLog } from './log.js'

export const tools = /** @type {const} */ ([
  'arduino-cli',
  'arduino-language-server',
  'arduino-fw-uploader',
  'clangd',
  'clangd-format',
])

/**
 * @typedef {typeof tools[number]} Tool
 *
 * @typedef {Object} GetToolNameResult
 * @property {string} remoteFilename
 * @property {string} localFilename
 *
 * @typedef {Object} GetToolNameParams
 * @property {Tool} tool
 * @property {string} version
 * @property {NodeJS.Platform} platform
 * @property {NodeJS.Architecture} arch
 *
 * @param {GetToolNameParams} params
 * @returns {GetToolNameResult}
 */
export function getToolName({ tool, version, platform, arch }) {
  const log = createLog('tools')

  log('Getting tool name for', tool, version, platform, arch)
  if (!tools.includes(tool)) {
    throw new Error(`Unsupported tool: ${tool}`)
  }

  const suffix = getToolSuffix({ platform, arch })
  log('Tool suffix:', suffix)

  const ext = getArchiveExtension(platform)
  log('Archive extension:', ext)

  const toolName = {
    remoteFilename: `${tool}_${version}_${suffix}${ext}`,
    localFilename: `${tool}${platform === 'win32' ? '.exe' : ''}`,
  }
  log('Tool name:', JSON.stringify(toolName))

  return toolName
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

function getArchiveExtension(platform) {
  switch (platform) {
    case 'win32':
      return '.zip'
    default:
      return '.tar.gz'
  }
}
