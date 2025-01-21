import { enable } from 'debug'

import { parse } from './cli.js'
import { getTool } from './get.js'

jest.mock('@xhmikosr/decompress', () => jest.fn())
jest.mock('debug', () => ({
  __esModule: true,
  ...jest.requireActual('debug'),
  enable: jest.fn(),
}))
jest.mock('./get.js')

describe('cli', () => {
  let consoleSpy

  beforeAll(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.mocked(getTool).mockResolvedValue({ toolPath: '' })
  })

  afterAll(() => {
    consoleSpy.mockRestore()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getTool).mockResolvedValue({ toolPath: '' })
  })

  it('should get the data', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1'])

    expect(getTool).toHaveBeenCalledWith({
      tool: 'arduino-cli',
      version: '1.1.1',
      destinationFolderPath: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      force: false,
      verbose: false,
    })
  })

  it('should enable the log with the --verbose flag', () => {
    jest.mocked(enable).mockImplementation(() => {})

    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '--verbose'])

    expect(enable).toHaveBeenCalledWith('*')
  })

  it('should override the destination with the -d flag', () => {
    parse([
      'node',
      'script.js',
      'get',
      'arduino-cli',
      '1.1.1',
      '-d',
      'path/to/out',
    ])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ destinationFolderPath: 'path/to/out' })
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
      'path/to/out',
    ])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ destinationFolderPath: 'path/to/out' })
    )
  })

  it('should override the platform with --platform flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-p', 'bar'])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'bar' })
    )
  })

  it('should override the platform with -p', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-p', 'foo'])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'foo' })
    )
  })

  it('should override the platform with --platform flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-p', 'bar'])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'bar' })
    )
  })

  it('should override the arch with -a flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-a', 'mirr'])

    expect(getTool).toHaveBeenCalledWith(
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

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ arch: 'murr' })
    )
  })

  it('should override the force with -f flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '-f'])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    )
  })

  it('should override the force with --force flag', () => {
    parse(['node', 'script.js', 'get', 'arduino-cli', '1.1.1', '--force'])

    expect(getTool).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    )
  })
})
