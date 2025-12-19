import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tmp from 'tmp-promise'

const npmCommand = (() => {
  if (process.env.npm_execpath) {
    return {
      command: process.env.npm_node_execpath || process.execPath,
      args: [process.env.npm_execpath],
    }
  }
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: [],
  }
})()

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const sourceFixturesDir = path.join(repoRoot, 'test', 'fixtures')

const fixtures = [
  { name: 'cjs', entry: 'smoke.js' },
  { name: 'esm', entry: 'smoke.mjs' },
]

async function main() {
  runStep('build', npmCommand.command, [...npmCommand.args, 'run', 'build'], {
    cwd: repoRoot,
  })

  const tarballPath = packTarball()
  const { tempFixturesDir, cleanupTempFixtures } = await createTempFixturesDir()
  try {
    for (const fixture of fixtures) {
      await runFixture(fixture, tarballPath, tempFixturesDir)
    }
    console.log('\nSmoke tests completed successfully')
  } finally {
    await fs.rm(tarballPath, { force: true })
    await cleanupTempFixtures?.()
  }
}

/**
 * @param {{ name: string; entry: string }} fixture
 * @param {string} tarballPath
 * @param {string} fixturesRoot
 */
async function runFixture(fixture, tarballPath, fixturesRoot) {
  const fixtureDir = path.join(fixturesRoot, fixture.name)
  const displayName = `${fixture.name} fixture`

  console.log(`\nRunning ${displayName}`)
  await cleanFixture(fixtureDir)

  runStep(
    `${displayName} install`,
    npmCommand.command,
    [
      ...npmCommand.args,
      'install',
      '--no-save',
      '--no-package-lock',
      '--prefer-offline',
      tarballPath,
    ],
    { cwd: fixtureDir }
  )

  try {
    runStep(
      `${displayName} smoke`,
      process.execPath,
      [path.join(fixtureDir, fixture.entry)],
      { cwd: fixtureDir }
    )
  } finally {
    await cleanFixture(fixtureDir)
  }
}

function packTarball() {
  console.log('\nPacking tarball...')
  const output = execFileSync(
    npmCommand.command,
    [...npmCommand.args, 'pack', '--json'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    }
  )
  const packResult = JSON.parse(output)
  const filename = Array.isArray(packResult)
    ? packResult[0]?.filename
    : packResult?.filename
  if (!filename) {
    throw new Error(`npm pack did not produce a filename: ${output}`)
  }
  const tarballPath = path.join(repoRoot, filename)
  console.log(`Tarball created at ${tarballPath}`)
  return tarballPath
}

async function createTempFixturesDir() {
  // Use a temp dir so module resolution cannot reach repo root node_modules.
  const { path: tempRoot, cleanup } = await tmp.dir({
    prefix: 'gat-smoke-',
    unsafeCleanup: true,
  })
  const tempFixturesDir = path.join(tempRoot, 'fixtures')
  await fs.cp(sourceFixturesDir, tempFixturesDir, { recursive: true })
  return { tempFixturesDir, cleanupTempFixtures: cleanup }
}

/** @param {string} dir */
async function cleanFixture(dir) {
  await fs.rm(path.join(dir, 'node_modules'), { recursive: true, force: true })
  await fs.rm(path.join(dir, 'package-lock.json'), { force: true })
}

/**
 * @param {string} label
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnSyncOptions} options
 */
function runStep(label, command, args, options) {
  console.log(`> ${label}: ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'null'}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
