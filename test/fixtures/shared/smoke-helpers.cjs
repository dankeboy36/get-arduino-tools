const assert = require('node:assert')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

/** @param {Record<string, unknown>} pkg */
function assertApi(pkg, label = 'package exports') {
  assert.ok(pkg, `${label} should be defined`)
  assert.strictEqual(
    typeof pkg.getTool,
    'function',
    `${label} should expose getTool`
  )
  assert.ok(Array.isArray(pkg.tools), `${label} should expose tools array`)
}

/** @param {string} fixtureDir */
function readInstalledPackageJson(fixtureDir) {
  return require(
    path.join(fixtureDir, 'node_modules', 'get-arduino-tools', 'package.json')
  )
}

/** @param {Record<string, unknown>} packageJson */
function assertPackageMetadata(packageJson) {
  assert.ok(packageJson.main, 'package.json should declare main')
  assert.ok(packageJson.exports, 'package.json should declare exports')
  assert.ok(packageJson.types, 'package.json should declare types')
}

/** @param {string} fixtureDir */
function runCliHelp(fixtureDir) {
  const cliResult = tryNpxHelp(fixtureDir) ?? runLocalBinary(fixtureDir)
  if (cliResult.error) {
    throw cliResult.error
  }
  const output = `${cliResult.stdout || ''}${cliResult.stderr || ''}`
  if (cliResult.status !== 0) {
    throw new Error(`gat help exited with ${cliResult.status}\n${output}`)
  }
  return output
}

/** @param {string} output */
function assertHelpOutput(output) {
  assert.match(
    output,
    /Get Arduino Tools/i,
    'CLI help output should mention the description'
  )
}

/** @param {string} cwd */
function tryNpxHelp(cwd) {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(npxCommand, ['--no-install', 'gat', 'help'], {
    cwd,
    encoding: 'utf8',
  })
  if (
    result.error &&
    'code' in result.error &&
    result.error.code === 'ENOENT'
  ) {
    return null
  }
  return result
}

/** @param {string} cwd */
function runLocalBinary(cwd) {
  const binName = process.platform === 'win32' ? 'gat.cmd' : 'gat'
  const binPath = path.join(cwd, 'node_modules', '.bin', binName)
  return spawnSync(binPath, ['help'], { cwd, encoding: 'utf8' })
}

module.exports = {
  assertApi,
  assertHelpOutput,
  assertPackageMetadata,
  readInstalledPackageJson,
  runCliHelp,
}
