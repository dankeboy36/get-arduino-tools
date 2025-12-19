import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const fixturesDir = path.join(repoRoot, 'test', 'fixtures')

const fixtures = [
  { name: 'cjs', entry: 'smoke.js' },
  { name: 'esm', entry: 'smoke.mjs' },
]

async function main() {
  runStep('build', npmCommand, ['run', 'build'], { cwd: repoRoot })

  const tarballPath = packTarball()
  try {
    for (const fixture of fixtures) {
      await runFixture(fixture, tarballPath)
    }
    console.log('\nSmoke tests completed successfully')
  } finally {
    await fs.rm(tarballPath, { force: true })
  }
}

/**
 * @param {{ name: string; entry: string }} fixture
 * @param {string} tarballPath
 */
async function runFixture(fixture, tarballPath) {
  const fixtureDir = path.join(fixturesDir, fixture.name)
  const displayName = `${fixture.name} fixture`

  console.log(`\nRunning ${displayName}`)
  await cleanFixture(fixtureDir)

  runStep(
    `${displayName} install`,
    npmCommand,
    [
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
  const output = execFileSync(npmCommand, ['pack', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
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
