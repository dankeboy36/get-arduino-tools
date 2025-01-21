import fs from 'node:fs/promises'
import path from 'node:path'

import decompress from '@xhmikosr/decompress'

import { extract } from './extract.js'
import { createLog } from './log.js'

jest.mock('node:fs/promises')

jest.mock('node:os', () => ({
  tmpdir: jest.fn().mockReturnValue('/tmp'),
}))

jest.mock('@xhmikosr/decompress', () => jest.fn())

jest.mock('./log.js', () => ({
  createLog: jest.fn(),
}))

describe('extract', () => {
  const log = jest.fn()

  beforeEach(() => {
    jest.mocked(createLog).mockReturnValue(log)
    jest.clearAllMocks()
  })

  it('should extract buffer to a temporary directory', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    const result = await extract({ buffer })

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
    expect(decompress).toHaveBeenCalledWith(buffer, mockTempDir, { strip: 0 })
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should log errors during disposal', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    const mockError = new Error('Deletion error')
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)
    jest.mocked(fs.rm).mockRejectedValue(mockError)

    const result = await extract({ buffer })
    await result.dispose()

    expect(fs.rm).toHaveBeenCalledWith(mockTempDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
    })
    expect(log).toHaveBeenCalledWith('Error deleting', mockTempDir, mockError)
  })

  it('should dispose the extracted files (on success)', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(decompress).mockResolvedValue(mockTempDir)
    jest.mocked(fs.rm).mockResolvedValue()

    const result = await extract({ buffer })
    await result.dispose()

    expect(fs.rm).toHaveBeenCalledWith(mockTempDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
    })
  })

  it('should dispose the extracted files (on error)', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const error = new Error('decompress error')
    jest.mocked(decompress).mockRejectedValueOnce(error)

    await expect(extract({ buffer })).rejects.toThrow(error)

    expect(log).toHaveBeenCalledWith(
      'Error extracting to',
      expect.any(String),
      error
    )
    expect(fs.rm).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
      force: true,
      maxRetries: 3,
    })
  })
})
