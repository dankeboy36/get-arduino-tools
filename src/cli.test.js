import path from 'node:path'

import debugModule from 'debug'
import waitFor from 'wait-for-expect'

import { parse } from './cli.js'
import getModule from './get.js'

const { tick, ProgressBarMock } = vi.hoisted(() => {
  const tick = vi.fn()
  const ProgressBarMock = vi.fn(function ProgressBar() {
    return { tick }
  })
  return { tick, ProgressBarMock }
})

vi.mock('progress', () => ({ default: ProgressBarMock }))

/** @type {NodeJS.Process['exit']} */
// @ts-ignore
const noopExit = () => {
  // never
}

describe('cli', () => {
  let mockLog
  let consoleSpy
  let exitSpy
  let getToolSpy
  let enableSpy

  beforeAll(() => {
    mockLog = vi.fn()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(noopExit)
    consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((args) => mockLog(args))
  })

  afterAll(() => {
    consoleSpy.mockRestore()
    exitSpy.mockRestore()
  })

  beforeEach(() => {
    vi.restoreAllMocks()

    mockLog.mockClear()

    // Keep the console/process spies from `beforeAll`
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(noopExit)
    consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((args) => mockLog(args))

    tick.mockClear()
    ProgressBarMock.mockClear()

    getToolSpy = vi
      .spyOn(getModule, 'getTool')
      .mockResolvedValue({ toolPath: '' })
    enableSpy = vi.spyOn(debugModule, 'enable').mockImplementation(() => {})
  })

  it('should get the data', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    expect(getToolSpy).toHaveBeenCalledWith({
      tool: 'arduino-cli',
      version: '1.1.1',
      destinationFolderPath: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      force: false,
      silent: false,
      verbose: false,
      onProgress: expect.any(Function),
      okIfExists: false,
    })

    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('should allow omitting the version', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'arduino-cli', version: undefined })
    )

    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('should provide progress', async () => {
    const currents = [0, 5, 5, 6, 10]

    getToolSpy.mockImplementation(async ({ onProgress }) => {
      currents.forEach((current) => onProgress?.({ current }))
      return { toolPath: '' }
    })

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    // noop 0
    expect(tick).toHaveBeenNthCalledWith(1, 5) // 5
    // noop 5
    expect(tick).toHaveBeenNthCalledWith(2, 1) // 6
    expect(tick).toHaveBeenNthCalledWith(3, 4) // 10
  })

  it('should enable the log with the --verbose flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '--verbose'])

    expect(enableSpy).toHaveBeenCalledWith('gat:*')
  })

  it('should omit the error stacktrace from the CLI output', async () => {
    getToolSpy.mockRejectedValueOnce(Error('my error'))

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    await waitFor(() => expect(mockLog).toHaveBeenCalledWith('my error'))
  })

  it('should prompt --force when errors with EEXIST', async () => {
    getToolSpy.mockRejectedValueOnce(
      Object.assign(new Error('my error'), { code: 'EEXIST' })
    )

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    await waitFor(() => expect(mockLog).toHaveBeenNthCalledWith(1, 'my error'))

    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should print the reason as is when has no message', async () => {
    getToolSpy.mockRejectedValueOnce('just string')

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    await waitFor(() => expect(mockLog).toHaveBeenCalledWith('just string'))
  })

  it('should override the destination with the -d flag', () => {
    parse([
      'node',
      'script.js',
      'get',
      'arduino-cli',
      '1.1.1',
      '-d',
      '/path/to/out',
    ])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ destinationFolderPath: '/path/to/out' })
    )
  })

  it('should override the destination with the --destination-folder-path flag', () => {
    parse([
      'node',
      'script.js',
      'get',
      'arduino-cli',
      '1.1.1',
      '--destination-folder-path',
      '/path/to/out',
    ])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ destinationFolderPath: '/path/to/out' })
    )
  })

  it('should resolve the absolute filesystem path of the destination', () => {
    parse([
      'node',
      'script.js',
      'get',
      'arduino-cli',
      '1.1.1',
      '-d',
      'path/to/out',
    ])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationFolderPath: path.join(process.cwd(), 'path/to/out'),
      })
    )
  })

  it('should error on extra positional args', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', './bin'])

    expect(getToolSpy).not.toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should override the platform with --platform flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-p', 'bar'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'bar' })
    )
  })

  it('should override the platform with -p', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-p', 'foo'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'foo' })
    )
  })

  it('should override the platform with --platform flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-p', 'bar'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'bar' })
    )
  })

  it('should override the arch with -a flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-a', 'mirr'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ arch: 'mirr' })
    )
  })

  it('should override the arch with --arch flag', () => {
    parse([
      'node',
      'script.js',
      'get',
      'arduino-cli',
      '1.1.1',
      '--arch',
      'murr',
    ])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ arch: 'murr' })
    )
  })

  it('should override the force with -f flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-f'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    )
  })

  it('should override the force with --force flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '--force'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    )
  })

  it('should enable silent mode with the --silent flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '--silent'])

    expect(getToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({ silent: true })
    )
  })

  it('should rethrow EEXIST if --ok-if-exists is not but --force is set', async () => {
    getToolSpy.mockRejectedValueOnce(
      Object.assign(new Error('my error'), { code: 'EEXIST' })
    )

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '--force'])

    await waitFor(() => expect(mockLog).toHaveBeenCalledWith('my error'))

    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should rethrow any code', async () => {
    getToolSpy.mockRejectedValueOnce(
      Object.assign(new Error('my error'), { code: 'ESOMEERRORCODE' })
    )

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    await waitFor(() => expect(mockLog).toHaveBeenCalledWith('my error'))

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
