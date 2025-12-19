import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// @ts-ignore
import gatDefault, { getTool, tools } from 'get-arduino-tools'

import helpers from '../shared/smoke-helpers.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const api = gatDefault ?? {}

helpers.assertApi({ getTool, tools }, 'ESM named exports')
helpers.assertApi(api, 'ESM default export')
helpers.assertPackageMetadata(helpers.readInstalledPackageJson(__dirname))
helpers.assertHelpOutput(helpers.runCliHelp(__dirname))

console.log('ESM smoke fixture passed')
