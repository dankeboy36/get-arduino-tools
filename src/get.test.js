import fs from 'node:fs/promises'
import path from 'node:path'

import { download } from './download.js'
import { extract } from './extract.js'
import { getTool } from './get.js'
import { createLog } from './log.js'
import { getToolName, tools } from './tools.js'

jest.mock('@xhmikosr/decompress', () => ({
  __esModule: true,
  default: jest.fn(), // https://archive.jestjs.io/docs/en/23.x/jest-object
}))

jest.mock('node:fs/promises')
jest.mock('./download.js')
jest.mock('./extract.js')
jest.mock('./log.js')
jest.mock('./tools.js')

describe('get', () => {
  const log = jest.fn()
  const mockTool = tools[0]
  const mockVersion = '1.0.0'
  const mockDestinationFolderPath = '/mock/destination'
  const mockPlatform = 'linux'
  const mockArch = 'x64'
  const mockBuffer = new Uint8Array([1, 2, 3])
  const mockExtractResult = {
    destinationPath: '/mock/extracted',
    dispose: jest.fn(),
  }

  beforeEach(() => {
    jest.mocked(createLog).mockReturnValue(log)
    jest.mocked(download).mockResolvedValue(mockBuffer)
    jest.mocked(extract).mockResolvedValue(mockExtractResult)
    jest.mocked(getToolName).mockReturnValue({
      localFilename: 'mockTool',
      remoteFilename: 'mockTool-1.0.0.tar.gz',
    })
    jest.clearAllMocks()
  })

  it('should download, extract, and copy the tool', async () => {
    const result = await getTool({
      tool: mockTool,
      version: mockVersion,
      destinationFolderPath: mockDestinationFolderPath,
      platform: mockPlatform,
      arch: mockArch,
    })

    expect(download).toHaveBeenCalledWith({
      tool: mockTool,
      remoteFilename: 'mockTool-1.0.0.tar.gz',
    })
    expect(extract).toHaveBeenCalledWith({ buffer: mockBuffer })
    expect(fs.copyFile).toHaveBeenCalledWith(
      path.join('/mock/extracted', 'mockTool'),
      path.join(mockDestinationFolderPath, 'mockTool'),
      fs.constants.COPYFILE_EXCL
    )
    expect(mockExtractResult.dispose).toHaveBeenCalled()
    expect(result.toolPath).toBe(
      path.join(mockDestinationFolderPath, 'mockTool')
    )
  })

  it('should throw an error if download fails', async () => {
    jest.mocked(download).mockRejectedValue(new Error('download error'))

    await expect(
      getTool({
        tool: mockTool,
        version: mockVersion,
        destinationFolderPath: mockDestinationFolderPath,
      })
    ).rejects.toThrow('Failed to download mockTool-1.0.0.tar.gz')
  })

  it('should overwrite the tool if force is true', async () => {
    await getTool({
      tool: mockTool,
      version: mockVersion,
      destinationFolderPath: mockDestinationFolderPath,
      force: true,
    })

    expect(fs.copyFile).toHaveBeenCalledWith(
      path.join('/mock/extracted', 'mockTool'),
      path.join(mockDestinationFolderPath, 'mockTool'),
      undefined
    )
  })

  it('should log messages during the process', async () => {
    await getTool({
      tool: mockTool,
      version: mockVersion,
      destinationFolderPath: mockDestinationFolderPath,
    })

    expect(log).toHaveBeenCalledWith(
      'Copying',
      path.join('/mock/extracted', 'mockTool'),
      'to',
      path.join(mockDestinationFolderPath, 'mockTool'),
      'with force:',
      false
    )
    expect(log).toHaveBeenCalledWith('Copied')
  })

  it('should throw an error if tool already exists and force is false', async () => {
    jest
      .mocked(fs.copyFile)
      .mockRejectedValue(Object.assign(new Error(), { code: 'EEXIST' }))

    await expect(
      getTool({
        tool: mockTool,
        version: mockVersion,
        destinationFolderPath: mockDestinationFolderPath,
      })
    ).rejects.toThrow('Tool already exists')
  })

  it('should throw an error if tool already exists and force is false', async () => {
    jest
      .mocked(fs.copyFile)
      .mockRejectedValue(Object.assign(new Error('mock error')))

    await expect(
      getTool({
        tool: mockTool,
        version: mockVersion,
        destinationFolderPath: mockDestinationFolderPath,
      })
    ).rejects.toThrow('mock error')
  })
})
