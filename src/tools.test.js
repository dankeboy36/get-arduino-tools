import { getToolName } from './tools.js'

describe('getToolName', () => {
  it('should return correct tool name for supported tools', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'win32',
      arch: 'x64',
    })
    const result = getToolName(params)
    expect(result).toEqual({
      remoteFilename: 'arduino-cli_0.18.3_Windows_64bit.zip',
      localFilename: 'arduino-cli.exe',
    })
  })

  it('should throw an error for unsupported tools', () => {
    const params = /** @type {const} */ ({
      tool: 'unsupported-tool',
      version: '1.0.0',
      platform: 'win32',
      arch: 'x64',
    })
    expect(() => getToolName(params)).toThrow(
      'Unsupported tool: unsupported-tool'
    )
  })

  it('should return correct tool name for macOS Intel', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'darwin',
      arch: 'x64',
    })
    const result = getToolName(params)
    expect(result).toEqual({
      remoteFilename: 'arduino-cli_0.18.3_macOS_64bit.tar.gz',
      localFilename: 'arduino-cli',
    })
  })

  it('should return correct tool name for macOS ARM64', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'darwin',
      arch: 'arm64',
    })
    const result = getToolName(params)
    expect(result).toEqual({
      remoteFilename: 'arduino-cli_0.18.3_macOS_ARM64.tar.gz',
      localFilename: 'arduino-cli',
    })
  })

  it('should return correct tool name for Linux x64', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'x64',
    })
    const result = getToolName(params)
    expect(result).toEqual({
      remoteFilename: 'arduino-cli_0.18.3_Linux_64bit.tar.gz',
      localFilename: 'arduino-cli',
    })
  })

  it('should return correct tool name for Linux (Raspberry Pi - arm7vl)', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'arm',
    })
    const result = getToolName(params)
    expect(result).toEqual({
      remoteFilename: 'arduino-cli_0.18.3_Linux_ARMv7.tar.gz',
      localFilename: 'arduino-cli',
    })
  })

  it('should return correct tool name for Linux ARM64', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'arm64',
    })
    const result = getToolName(params)
    expect(result).toEqual({
      remoteFilename: 'arduino-cli_0.18.3_Linux_ARM64.tar.gz',
      localFilename: 'arduino-cli',
    })
  })

  it('should throw an error for unsupported platform', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'unsupported-platform',
      arch: 'x64',
    })
    expect(() => getToolName(params)).toThrow(
      'Unsupported platform: unsupported-platform, arch: x64'
    )
  })

  it('should throw an error for unsupported architecture', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'unsupported-arch',
    })
    expect(() => getToolName(params)).toThrow(
      'Unsupported platform: linux, arch: unsupported-arch'
    )
  })
})
