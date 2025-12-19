#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL, fileURLToPath } from 'node:url'

import prettier from 'prettier'
import semver from 'semver'

// @ts-ignore
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const versionsFilePath = path.join(repoRoot, 'src', 'versions.js')
const toolsFilePath = path.join(repoRoot, 'src', 'tools.js')

const githubToken =
  process.env.GITHUB_TOKEN ||
  process.env.GH_TOKEN ||
  process.env.GITHUB_API_TOKEN

/** @param {string} repo E.g. "arduino/arduino-cli" */
async function fetchLatestReleaseVersion(repo) {
  const url = `https://api.github.com/repos/${repo}/releases/latest`

  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'get-arduino-tools/update-versions',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Failed to fetch latest release for ${repo}: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`
    )
  }

  /** @type {{ tag_name?: string }} */
  const json = await res.json()
  if (!json.tag_name) {
    throw new Error(`Missing tag_name in GitHub response for ${repo}`)
  }

  const coerced = semver.coerce(json.tag_name)
  if (!coerced) {
    throw new Error(
      `Could not parse a semver version from ${repo} tag_name=${JSON.stringify(json.tag_name)}`
    )
  }

  return coerced.version
}

/** @param {string} tool */
function getRepoForTool(tool) {
  if (tool === 'clangd' || tool === 'clang-format') {
    return 'arduino/clang-static-binaries'
  }
  return `arduino/${tool}`
}

/** @param {string} key */
function isValidIdentifier(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
}

/** @param {Readonly<Record<string, string>>} latestVersions */
function renderVersionsFile(latestVersions) {
  const lines = []
  for (const [tool, version] of Object.entries(latestVersions)) {
    const key = isValidIdentifier(tool) ? tool : `'${tool}'`
    lines.push(`  ${key}: '${version}',`)
  }

  return `/** @type {Record<import('./index.js').Tool, string>} */
export const latestVersions = {
${lines.join('\n')}
}

export default {
  getLatestVersion: (/** @type {import('./index.js').Tool} */ tool) =>
    latestVersions[tool],
}
`
}

async function main() {
  const { tools } = await import(
    `${pathToFileURL(toolsFilePath).href}?cacheBust=${Date.now()}`
  )
  const versionsModule = await import(
    `${pathToFileURL(versionsFilePath).href}?cacheBust=${Date.now()}`
  )

  const latestVersions = Object.fromEntries(
    tools.map((/** @type {string} */ tool) => [
      tool,
      versionsModule.default.getLatestVersion(tool),
    ])
  )

  /** @type {Map<string, string[]>} */
  const repoToTools = new Map()
  for (const tool of tools) {
    const repo = getRepoForTool(tool)
    const list = repoToTools.get(repo) ?? []
    list.push(tool)
    repoToTools.set(repo, list)
  }

  /** @type {Record<string, string>} */
  const latestByRepo = {}
  await Promise.all(
    Array.from(repoToTools.keys()).map(async (repo) => {
      console.log(`Fetching latest release for ${repo}...`)
      const version = await fetchLatestReleaseVersion(repo)
      console.log(`${repo}; ${version}`)
      latestByRepo[repo] = version
    })
  )

  /** @type {Record<string, string>} */
  const updated = { ...latestVersions }

  let changed = false
  for (const tool of tools) {
    const repo = getRepoForTool(tool)
    const remoteVersion = latestByRepo[repo]

    const currentVersion = latestVersions[tool]
    const currentCoerced = semver.coerce(currentVersion)
    const remoteCoerced = semver.coerce(remoteVersion)
    if (!remoteCoerced) continue

    if (!currentCoerced || semver.gt(remoteCoerced, currentCoerced)) {
      updated[tool] = remoteCoerced.version
      changed = true
    }
  }

  if (!changed) {
    console.log('No updates found.')
    return
  }

  const raw = renderVersionsFile(updated)
  const resolvedConfig = (await prettier.resolveConfig(versionsFilePath)) ?? {}
  const formatted = await prettier.format(raw, {
    ...resolvedConfig,
    filepath: versionsFilePath,
  })

  await fs.writeFile(versionsFilePath, formatted, 'utf8')

  console.log(`Updated ${path.relative(repoRoot, versionsFilePath)}`)
}

await main()
