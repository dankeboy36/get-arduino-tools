import { fileURLToPath } from 'node:url'

import tmp from 'tmp-promise'

import { execFile } from './execFile.js'

/**
 * @typedef {Object} CliTestParams
 * @property {string} tool
 * @property {string} version
 * @property {(toolPath: string, expected: string) => Promise<void>} expectVersion
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
  /** @type {Record<import('./tools.js').Tool, CliTestParams>} */
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
        const stdout = await execFile(toolPath, ['--version'], true)
        expect(stdout).toContain('1.3.0')
      },
    },
  }
  Object.values(params).map(({ tool, version, expectVersion }) =>
    // eslint-disable-next-line vitest/expect-expect
    it(`should get the ${tool}`, async () => {
      const { path: tempDirPath } = await tmp.dir({
        keep: false,
        unsafeCleanup: true,
      })

      const cliPath = fileURLToPath(new URL('../bin/cli.cjs', import.meta.url))
      const toolPath = await execFile(process.argv[0], [
        cliPath,
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
