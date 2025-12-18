import stream from 'node:stream'
import streamPromises from 'node:stream/promises'

import tar from 'tar-stream'
import tmp from 'tmp-promise'
import unzip from 'unzip-stream'

import { extract } from './extract.js'
import logModule from './log.js'

const { Readable } = stream

describe('extract', () => {
  const mockTempDir = '/tmp/gat-12345'
  /** @type {ReturnType<typeof import('./log').createLog>} */
  let log
  /** @type {ReturnType<typeof import('tar-stream').extract>} */
  let mockTarExtractStream
  /** @type {ReturnType<typeof import('unzip-stream').Parse>} */
  let mockParseZip
  /** @type {import('tmp-promise').DirectoryResult['cleanup']} */
  let mockCleanup

  beforeEach(() => {
    vi.restoreAllMocks()

    log = vi.fn()
    mockTarExtractStream = { on: vi.fn() }
    mockParseZip = vi.fn()
    mockCleanup = vi.fn()

    vi.spyOn(tmp, 'dir').mockResolvedValue({
      path: mockTempDir,
      cleanup: mockCleanup,
    })
    vi.spyOn(logModule, 'createLog').mockReturnValue(log)
    vi.spyOn(tar, 'extract').mockReturnValue(mockTarExtractStream)
    vi.spyOn(unzip, 'Parse').mockReturnValue(mockParseZip)
    vi.spyOn(streamPromises, 'pipeline').mockResolvedValue()
  })

  it('should extract buffer to a temporary directory', async () => {
    const source = Readable.from([1, 2, 3])

    const result = await extract({ source, archiveType: 'zip' })

    expect(tmp.dir).toHaveBeenCalledWith({
      prefix: 'gat-',
      unsafeCleanup: true,
      tries: 3,
      keep: false,
    })
    expect(unzip.Parse).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should extract gzip tar buffer to a temporary directory', async () => {
    const source = Readable.from([1, 2, 3])

    const result = await extract({ source, archiveType: 'gzip' })

    expect(tar.extract).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should extract bzip2 tar buffer to a temporary directory', async () => {
    const source = Readable.from([1, 2, 3])

    const result = await extract({ source, archiveType: 'bzip2' })

    expect(tar.extract).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
  })

  it('should throw an error for unsupported archive type', async () => {
    const source = Readable.from([1, 2, 3])

    const archiveType = /** @type {any} */ ('unsupported')
    await expect(extract({ source, archiveType })).rejects.toThrow(
      'Unsupported archive type: unsupported'
    )
  })

  it('should cleanup the extracted files (on success)', async () => {
    const source = Readable.from([1, 2, 3])

    const result = await extract({ source, archiveType: 'zip' })
    await result.cleanup()

    expect(mockCleanup).toHaveBeenCalled()
  })

  it('should cleanup the extracted files (on error)', async () => {
    const source = Readable.from([1, 2, 3])
    const error = new Error('decompress error')
    vi.spyOn(unzip, 'Parse').mockImplementation(() => {
      throw error
    })

    await expect(extract({ source, archiveType: 'zip' })).rejects.toThrow(error)

    expect(log).toHaveBeenCalledWith(
      'Error extracting to',
      expect.any(String),
      error
    )
    expect(mockCleanup).toHaveBeenCalled()
  })

  it('should extract zip buffer to a temporary directory and log extraction', async () => {
    const source = Readable.from([1, 2, 3])

    const result = await extract({ source, archiveType: 'zip' })

    expect(unzip.Parse).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
    expect(log).toHaveBeenCalledWith('extracting to ', mockTempDir)
  })

  it('should extract tar buffer with strip to a temporary directory and log extraction', async () => {
    const source = Readable.from([1, 2, 3])

    const result = await extract({ source, archiveType: 'bzip2' })

    expect(tar.extract).toHaveBeenCalled()
    expect(result.destinationPath).toBe(mockTempDir)
    expect(log).toHaveBeenCalledWith('extracting to ', mockTempDir)
  })
})
