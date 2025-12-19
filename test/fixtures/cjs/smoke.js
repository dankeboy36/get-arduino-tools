// @ts-ignore
const pkg = require('get-arduino-tools')

const helpers = require('../shared/smoke-helpers.cjs')

const fixtureDir = __dirname

helpers.assertApi(pkg, 'CJS require')
helpers.assertPackageMetadata(helpers.readInstalledPackageJson(fixtureDir))
helpers.assertHelpOutput(helpers.runCliHelp(fixtureDir))

console.log('CJS smoke fixture passed')
