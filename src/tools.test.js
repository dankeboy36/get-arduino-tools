import { getToolDescription } from './tools.js'

describe('getToolDescription', () => {
  it('should return correct tool name for supported tools', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'win32',
      arch: 'x64',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_0.18.3_Windows_64bit.zip',
      })
    )
  })

  it('should throw an error for unsupported tools', () => {
    const params = /** @type {const} */ ({
      tool: 'unsupported-tool',
      version: '1.0.0',
      platform: 'win32',
      arch: 'x64',
    })
    expect(() => getToolDescription(params)).toThrow(
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
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_0.18.3_macOS_64bit.tar.gz',
      })
    )
  })

  it('should return correct tool name for macOS ARM64', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'darwin',
      arch: 'arm64',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_0.18.3_macOS_ARM64.tar.gz',
      })
    )
  })

  it('should return correct tool name for Linux x64', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'x64',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_0.18.3_Linux_64bit.tar.gz',
      })
    )
  })

  it('should return correct tool name for Linux (Raspberry Pi - arm7vl)', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'arm',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_0.18.3_Linux_ARMv7.tar.gz',
      })
    )
  })

  it('should return correct tool name for Linux ARM64', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'linux',
      arch: 'arm64',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_0.18.3_Linux_ARM64.tar.gz',
      })
    )
  })

  it('should use tool in the URL for clangd on Windows', () => {
    const params = /** @type {const} */ ({
      tool: 'clangd',
      version: '0.18.3',
      platform: 'win32',
      arch: 'x64',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/tools/clangd_0.18.3_Windows_64bit.zip',
      })
    )
  })

  it('should use tool in the URL for clangd on non-Windows', () => {
    const params = /** @type {const} */ ({
      tool: 'clangd',
      version: '0.18.3',
      platform: 'linux',
      arch: 'x64',
    })
    const result = getToolDescription(params)
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://downloads.arduino.cc/tools/clangd_0.18.3_Linux_64bit.tar.bz2',
      })
    )
  })

  it('should throw an error for unsupported platform', () => {
    const params = /** @type {const} */ ({
      tool: 'arduino-cli',
      version: '0.18.3',
      platform: 'unsupported-platform',
      arch: 'x64',
    })
    expect(() => getToolDescription(params)).toThrow(
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
    expect(() => getToolDescription(params)).toThrow(
      'Unsupported platform: linux, arch: unsupported-arch'
    )
  })
})
