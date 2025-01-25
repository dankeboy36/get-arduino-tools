import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import { extract as extractTar } from 'tar-stream'
import { Parse as ParseZip } from 'unzip-stream'
// import  from 'unbzip2-stream'

import { extract } from './extract.js'
import { createLog } from './log.js'

jest.mock('node:fs/promises')
jest.mock('node:stream/promises')

jest.mock('tar-stream')
jest.mock('unzip-stream')
jest.mock('unbzip2-stream')

jest.mock('node:os', () => ({
  tmpdir: jest.fn().mockReturnValue('/tmp'),
}))

jest.mock('./log.js', () => ({
  createLog: jest.fn(),
}))

describe('extract', () => {
  let log
  let mockTarExtract
  let mockParseZip
  let mockBzip2

  beforeEach(() => {
    log = jest.fn()
    mockTarExtract = {
      on: jest.fn(),
      // // Add a mock implementation for the 'on' method
      // on: jest.fn((event, callback) => {
      //   if (event === 'entry') {
      //     callback(
      //       { type: 'file', name: 'test.txt' },
      //       Readable.from([Buffer.from('test')]),
      //       jest.fn()
      //     )
      //   }
      // }),
    }
    mockParseZip = jest.fn()
    mockBzip2 = jest.fn()

    jest.mocked(createLog).mockReturnValue(log)
    jest.mocked(extractTar).mockReturnValue(mockTarExtract)
    jest.mocked(ParseZip).mockReturnValue(mockParseZip)
    jest.mocked(pipeline).mockResolvedValue()
    jest.clearAllMocks()
  })

  it('should extract buffer to a temporary directory', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    const result = await extract({ buffer, archiveType: 'zip' })

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
    expect(ParseZip).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should extract gzip tar buffer to a temporary directory', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    const result = await extract({ buffer, archiveType: 'gzip' })

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
    expect(extractTar).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should extract bzip2 tar buffer to a temporary directory', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    const result = await extract({ buffer, archiveType: 'bzip2' })

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
    expect(extractTar).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should throw an error for unsupported archive type', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    await expect(
      extract({ buffer, archiveType: 'unsupported' })
    ).rejects.toThrow('Unsupported archive type: unsupported')

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
  })

  it('should log errors during disposal', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    const mockError = new Error('Deletion error')
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)
    jest.mocked(fs.rm).mockRejectedValue(mockError)

    const result = await extract({ buffer, archiveType: 'zip' })
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
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)
    jest.mocked(fs.rm).mockResolvedValue()

    const result = await extract({ buffer, archiveType: 'zip' })
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
    jest.mocked(ParseZip).mockImplementation(() => {
      throw error
    })

    await expect(extract({ buffer, archiveType: 'zip' })).rejects.toThrow(error)

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

  it('should extract zip buffer to a temporary directory and log extraction', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    const result = await extract({ buffer, archiveType: 'zip' })

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
    expect(ParseZip).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
    expect(log).toHaveBeenCalledWith('extracting to ', mockTempDir)
  })

  it('should extract tar buffer with strip to a temporary directory and log extraction', async () => {
    const buffer = Buffer.from([1, 2, 3])
    const mockTempDir = '/tmp/gat-12345'
    jest.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir)

    const result = await extract({ buffer, archiveType: 'bzip2' })

    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join('/tmp', 'gat-'))
    expect(extractTar).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
    expect(log).toHaveBeenCalledWith('extracting to ', mockTempDir)
  })
})
