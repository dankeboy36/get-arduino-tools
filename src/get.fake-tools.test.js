import fs from 'node:fs/promises'
import path from 'node:path'

import debug from 'debug'
import tmp from 'tmp-promise'

import { download } from './download.js'
import { getTool } from './get.js'
import { createToolBasename, getArchiveType } from './tools.js'

jest.mock('./download.js')
jest.mock('./tools.js')

debug.enable('gat:*')

describe('get', () => {
  let tempDirPath
  let cleanup

  beforeEach(async () => {
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
    jest
      .mocked(download)
      .mockResolvedValue(loadFakeToolByName('fake-tool.tar.gz'))
    jest.mocked(createToolBasename).mockReturnValue('fake-tool')
    jest.mocked(getArchiveType).mockReturnValue('gzip')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    expect(fs.access(toolPath, fs.constants.X_OK)).resolves.toBeUndefined()
  })

  it('should preserve the executable flag of the tool (zip)', async () => {
    jest.mocked(download).mockResolvedValue(loadFakeToolByName('fake-tool.zip'))
    jest.mocked(createToolBasename).mockReturnValue('fake-tool.bat')
    jest.mocked(getArchiveType).mockReturnValue('zip')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    expect(fs.access(toolPath, fs.constants.X_OK)).resolves.toBeUndefined()
  })

  it('should preserve the executable flag of the non-Arduino tool (bzip2)', async () => {
    jest
      .mocked(download)
      .mockResolvedValue(loadFakeToolByName('fake-tool-clang.tar.bz2'))
    jest.mocked(createToolBasename).mockReturnValue('fake-tool')
    jest.mocked(getArchiveType).mockReturnValue('bzip2')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    expect(fs.access(toolPath, fs.constants.X_OK)).resolves.toBeUndefined()
  })

  it('should preserve the executable flag of the non-Arduino tool on Windows (bzip2)', async () => {
    jest
      .mocked(download)
      .mockResolvedValue(loadFakeToolByName('fake-tool-clang-win32.tar.bz2'))
    jest.mocked(createToolBasename).mockReturnValue('fake-tool.bat')
    jest.mocked(getArchiveType).mockReturnValue('bzip2')

    const { toolPath } = await getTool({
      tool: '',
      version: '',
      destinationFolderPath: tempDirPath,
    })

    expect(fs.access(toolPath, fs.constants.X_OK)).resolves.toBeUndefined()
  })

  async function loadFakeToolByName(fakeToolName) {
    const originalModule = jest.requireActual('node:fs/promises')
    const toolPath = path.join(__dirname, '../fake-tools', fakeToolName)
    const buffer = await originalModule.readFile(toolPath)
    return buffer
  }
})
