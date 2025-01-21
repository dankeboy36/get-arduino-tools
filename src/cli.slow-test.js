import path from 'node:path'
import { promisify } from 'node:util'

import tmp from 'tmp'

import { execFile } from './execFile.js'

/**
 * @typedef {Object} CliTestParams
 * @property {string} tool
 * @property {string} version
 * @property {(toolPath:string,expected:string)=>Promise<void>} expectVersion
 */

const tmpDir = promisify(tmp.dir)

/** @type {CliTestParams['expectVersion']} */
const arduinoToolExpectVersion = async (toolPath, expected) => {
  const stdout = await execFile(toolPath, ['version', '--format', 'json'])
  expect(JSON.parse(stdout).VersionString).toBe(expected)
}
/** @type {CliTestParams['expectVersion']} */
const clangToolExpectVersion = async (toolPath, expected) => {
  const stdout = await execFile(toolPath, ['--version'])
  expect(stdout).toContain(expected)
}

describe('cli', () => {
  /** @type {CliTestParams[]} */
  const params = [
    {
      tool: 'arduino-cli',
      version: '1.1.1',
      expectVersion: arduinoToolExpectVersion,
    },
    {
      tool: 'arduino-fwuploader',
      version: '2.4.1',
      expectVersion: arduinoToolExpectVersion,
    },
    {
      tool: 'arduino-language-server',
      version: '0.7.6',
      expectVersion: async (toolPath) => {
        // The Arduino LS requires the CLI and clangd. The assertion expects a failure.
        const stdout = await execFile(toolPath, ['version'], true)
        expect(stdout).toContain('Path to ArduinoCLI config file must be set')
      },
    },
    {
      tool: 'clangd',
      version: '14.0.0',
      expectVersion: clangToolExpectVersion,
    },
    {
      tool: 'clang-format',
      version: '14.0.0',
      expectVersion: clangToolExpectVersion,
    },
  ]
  params.map(({ tool, version, expectVersion }) =>
    it(`should get the ${tool}`, async () => {
      const tempDirPath = await tmpDir()

      const toolPath = await execFile(process.argv[0], [
        path.join(__dirname, '../bin/cli.js'),
        'get',
        tool,
        version,
        '-d',
        tempDirPath,
        '--verbose',
      ])

      await expectVersion(toolPath, version)
    })
  )
})
