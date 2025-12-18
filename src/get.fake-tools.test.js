import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import stream from 'node:stream'
import { fileURLToPath } from 'node:url'

import tmp from 'tmp-promise'

import downloadModule from './download.js'
import { getTool } from './get.js'
import toolsModule from './tools.js'

const { Readable } = stream

const actualDownload = downloadModule.download

const itIsNotWin32 = process.platform !== 'win32' ? it : it.skip

describe('get', () => {
  /** @type {string} */
  let tempDirPath
  /** @type {import('tmp-promise').DirectoryResult['cleanup']} */
  let cleanup

  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(toolsModule, 'getDownloadUrl').mockReturnValue(
      'https://downloads.arduino.cc/mock'
    )

    const tmpDirResult = await tmp.dir({
      keep: false,
      tries: 3,
      unsafeCleanup: true,
    })
    tempDirPath = tmpDirResult.path
    cleanup = tmpDirResult.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('should preserve the executable flag of the tool (gzip)', async () => {
    vi.spyOn(downloadModule, 'download').mockResolvedValue(
      loadFakeToolByName('fake-tool.tar.gz')
    )
    vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool')
    vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('gzip')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    await expect(
      fs.access(toolPath, fs.constants.X_OK)
    ).resolves.toBeUndefined()
  })

  it('should preserve the executable flag of the tool (zip)', async () => {
    vi.spyOn(downloadModule, 'download').mockResolvedValue(
      loadFakeToolByName('fake-tool.zip')
    )
    vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool.bat')
    vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('zip')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    await expect(
      fs.access(toolPath, fs.constants.X_OK)
    ).resolves.toBeUndefined()
  })

  it('should preserve the executable flag of the non-Arduino tool (bzip2)', async () => {
    vi.spyOn(downloadModule, 'download').mockResolvedValue(
      loadFakeToolByName('fake-tool-clang.tar.bz2')
    )
    vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool')
    vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('bzip2')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    await expect(
      fs.access(toolPath, fs.constants.X_OK)
    ).resolves.toBeUndefined()
  })

  it('should preserve the executable flag of the non-Arduino tool on Windows (bzip2)', async () => {
    vi.spyOn(downloadModule, 'download').mockResolvedValue(
      loadFakeToolByName('fake-tool-clang-win32.tar.bz2')
    )
    vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool.bat')
    vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('bzip2')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    await expect(
      fs.access(toolPath, fs.constants.X_OK)
    ).resolves.toBeUndefined()
  })

  it('should create the destination folder', async () => {
    vi.spyOn(downloadModule, 'download').mockResolvedValue(
      loadFakeToolByName('fake-tool.zip')
    )
    vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool.bat')
    vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('zip')

    const destinationFolderPath = path.join(tempDirPath, 'nested/deep')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath,
    })

    await expect(
      fs.access(toolPath, fs.constants.X_OK)
    ).resolves.toBeUndefined()
  })

  describe('zip-slip', () => {
    itIsNotWin32('should error (zip)', async () => {
      vi.spyOn(downloadModule, 'download').mockResolvedValue(
        loadFakeToolByName('zip-slip/evil.zip')
      )
      vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('evil.sh')
      vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('zip')

      await expect(
        getTool({
          tool: '',
          version: '',
          destinationFolderPath: tempDirPath,
        })
      ).rejects.toThrow(/invalid archive entry/gi)
    })

    itIsNotWin32('should error (tar.gz)', async () => {
      vi.spyOn(downloadModule, 'download').mockResolvedValue(
        loadFakeToolByName('zip-slip/evil.tar.gz')
      )
      vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('evil.sh')
      vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('gzip')

      await expect(
        getTool({
          tool: '',
          version: '',
          destinationFolderPath: tempDirPath,
        })
      ).rejects.toThrow(/invalid archive entry/gi)
    })

    itIsNotWin32('should error (tar.bz2)', async () => {
      vi.spyOn(downloadModule, 'download').mockResolvedValue(
        loadFakeToolByName('zip-slip/evil.tar.bz2')
      )
      vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('evil.sh')
      vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('bzip2')

      await expect(
        getTool({
          tool: '',
          version: '',
          destinationFolderPath: tempDirPath,
        })
      ).rejects.toThrow(/invalid archive entry/gi)
    })
  })

  describe('with fake server', () => {
    /** @type {import('node:http').Server} */
    let server

    beforeAll(async () => {
      server = http.createServer(async (_, res) => {
        const { body, length } = await loadFakeToolByName('fake-tool.tar.gz')
        res.setHeader('Content-Type', 'text/plain')
        res.setHeader('Content-Length', length)
        body.pipe(res)
      })
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    })

    afterAll(() => {
      server?.close()
    })

    it('should cancel the download', async () => {
      const { address, port } = server.address()
      vi.spyOn(downloadModule, 'download').mockImplementation(actualDownload)
      vi.spyOn(toolsModule, 'getDownloadUrl').mockReturnValue(
        `http://${address}:${port}`
      )
      vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool')
      vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('gzip')

      const controller = new AbortController()
      const { signal } = controller
      controller.abort()

      await expect(
        getTool({
          tool: '',
          version: '',
          destinationFolderPath: tempDirPath,
          signal,
        })
      ).rejects.toThrow(/abort/)

      await expect(fs.readdir(tempDirPath)).resolves.toStrictEqual([])
    })

    it('should support progress', async () => {
      const { address, port } = server.address()
      vi.spyOn(downloadModule, 'download').mockImplementation(actualDownload)
      vi.spyOn(toolsModule, 'getDownloadUrl').mockReturnValue(
        `http://${address}:${port}`
      )
      vi.spyOn(toolsModule, 'createToolBasename').mockReturnValue('fake-tool')
      vi.spyOn(toolsModule, 'getArchiveType').mockReturnValue('gzip')
      const onProgress = vi.fn()

      await getTool({
        tool: '',
        version: '',
        destinationFolderPath: tempDirPath,
        onProgress,
      })

      await expect(fs.readdir(tempDirPath)).resolves.toStrictEqual([
        'fake-tool',
      ])
      expect(onProgress).toHaveBeenNthCalledWith(1, { current: 50 })
      expect(onProgress).toHaveBeenNthCalledWith(2, { current: 100 })
    })
  })

  /** @param {string} fakeToolName */
  async function loadFakeToolByName(fakeToolName) {
    const toolPath = path.join(
      // @ts-ignore
      fileURLToPath(new URL('../fake-tools', import.meta.url)),
      fakeToolName
    )
    const buffer = await fs.readFile(toolPath)
    const readable = Readable.from(buffer)
    return {
      body: readable,
      length: buffer.length,
    }
  }
})
