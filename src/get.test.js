import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import stream from 'node:stream'
import streamPromises from 'node:stream/promises'

import downloadModule from './download.js'
import extractModule from './extract.js'
import { getTool } from './get.js'
import logModule from './log.js'
import progressModule from './progress.js'
import toolsModule from './tools.js'

const { Readable, PassThrough } = stream
const { ProgressCounter } = progressModule

const actualGetDownloadUrl = toolsModule.getDownloadUrl
const actualIsArduinoTool = toolsModule.isArduinoTool

describe('get', () => {
  const log = vi.fn()
  const mockTool = 'mockTool'
  const mockVersion = '1.0.0'
  const mockDestinationFolderPath = '/mock/destination'
  const mockPlatform = 'linux'
  const mockArch = 'x64'
  const mockData = '1, 2, 3, 4, 5'

  const mockExtractResult = {
    destinationPath: '/mock/extracted',
    cleanup: vi.fn(),
  }

  const mockedFd = {
    createWriteStream: vi.fn(() => new PassThrough()),
  }

  /** @type {import('vitest').MockInstance} */
  let getDownloadUrlSpy
  /** @type {import('vitest').MockInstance} */
  let isArduinoToolSpy

  beforeEach(() => {
    vi.restoreAllMocks()

    vi.spyOn(fsSync, 'createReadStream').mockReturnValue(Readable.from(''))

    vi.spyOn(logModule, 'createLog').mockReturnValue(log)
    vi.spyOn(downloadModule, 'download').mockResolvedValue({
      body: Readable.from(mockData),
      length: 111,
    })
    vi.spyOn(extractModule, 'extract').mockResolvedValue(mockExtractResult)
    vi.spyOn(streamPromises, 'pipeline').mockResolvedValue()

    vi.spyOn(fs, 'open').mockResolvedValue(mockedFd)
    vi.spyOn(fs, 'unlink').mockResolvedValue()

    vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue(mockTool)
    vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('zip')

    getDownloadUrlSpy = vi
      .spyOn(toolsModule, 'getDownloadUrl')
      .mockReturnValue('https://downloads.arduino.cc/mock')
    isArduinoToolSpy = vi
      .spyOn(toolsModule, 'isArduinoTool')
      .mockReturnValue(false)
  })

  it('should open a file, download, extract, and pipe the tool to the file', async () => {
    getDownloadUrlSpy.mockImplementation(actualGetDownloadUrl)
    isArduinoToolSpy.mockImplementation(actualIsArduinoTool)
    toolsModule.createToolBasename.mockReturnValue('arduino-cli')

    const result = await getTool({
      tool: 'arduino-cli',
      version: mockVersion,
      destinationFolderPath: mockDestinationFolderPath,
      platform: mockPlatform,
      arch: mockArch,
    })

    expect(fs.open).toHaveBeenCalledWith(
      path.join(mockDestinationFolderPath, 'arduino-cli'),
      'wx',
      511
    )
    expect(downloadModule.download).toHaveBeenCalledWith({
      url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_1.0.0_Linux_64bit.tar.gz',
      signal: undefined,
    })
    expect(extractModule.extract).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.any(Readable),
        archiveType: 'zip',
        counter: expect.any(ProgressCounter),
      })
    )
    expect(mockExtractResult.cleanup).toHaveBeenCalled()
    expect(result.toolPath).toBe(
      path.join(mockDestinationFolderPath, 'arduino-cli')
    )
  })

  it('should throw an error if download fails', async () => {
    const err = new Error('download error')
    downloadModule.download.mockRejectedValue(err)

    await expect(
      getTool({
        tool: mockTool,
        version: mockVersion,
        destinationFolderPath: mockDestinationFolderPath,
      })
    ).rejects.toThrow(err)
  })

  it('should overwrite the tool if force is true', async () => {
    await getTool({
      tool: mockTool,
      version: mockVersion,
      destinationFolderPath: mockDestinationFolderPath,
      force: true,
    })

    expect(fs.open).toHaveBeenCalledWith(
      path.join(mockDestinationFolderPath, mockTool),
      'w',
      511
    )
  })

  it('should throw an error if tool already exists and force is false', async () => {
    const err = Object.assign(new Error(), { code: 'EEXIST' })
    fs.open.mockRejectedValue(err)

    await expect(
      getTool({
        tool: mockTool,
        version: mockVersion,
        destinationFolderPath: mockDestinationFolderPath,
      })
    ).rejects.toThrow(err)
  })
})
