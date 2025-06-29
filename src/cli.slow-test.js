const path = require('node:path')

const tmp = require('tmp-promise')

const { execFile } = require('./execFile')

/**
 * @typedef {Object} CliTestParams
 * @property {string} tool
 * @property {string} version
 * @property {(toolPath:string,expected:string)=>Promise<void>} expectVersion
 */

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
  /** @type {Record<import('./tools').Tool, CliTestParams>} */
  const params = {
    'arduino-cli': {
      tool: 'arduino-cli',
      version: '1.2.2',
      expectVersion: arduinoToolExpectVersion,
    },
    'arduino-fwuploader': {
      tool: 'arduino-fwuploader',
      version: '2.4.1',
      expectVersion: arduinoToolExpectVersion,
    },
    'arduino-language-server': {
      tool: 'arduino-language-server',
      version: '0.7.7',
      expectVersion: async (toolPath) => {
        // The Arduino LS requires the CLI and clangd. The assertion expects a failure.
        const stdout = await execFile(toolPath, ['version'], true)
        expect(stdout).toContain('Path to ArduinoCLI config file must be set')
      },
    },
    clangd: {
      tool: 'clangd',
      version: '14.0.0',
      expectVersion: clangToolExpectVersion,
    },
    'clang-format': {
      tool: 'clang-format',
      version: '14.0.0',
      expectVersion: clangToolExpectVersion,
    },
    'arduino-lint': {
      tool: 'arduino-lint',
      version: '1.3.0',
      expectVersion: async (toolPath) => {
        // The Arduino Lint requires the CLI to be in a library folder, for example
        // _This will automatically detect the project type and check it against the relevant rules._
        // https://arduino.github.io/arduino-lint/latest/#getting-started
        const stdout = await execFile(toolPath, ['version'], true)
        expect(stdout).toContain('PROJECT_PATH argument version does not exist')
      },
    },
  }
  Object.values(params).map(({ tool, version, expectVersion }) =>
    it(`should get the ${tool}`, async () => {
      const { path: tempDirPath } = await tmp.dir({
        keep: false,
        unsafeCleanup: true,
      })

      const toolPath = await execFile(process.argv[0], [
        path.join(__dirname, '../bin/cli'),
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
