const { Command } = require('commander')
const { enable } = require('debug')

const { getTool, tools } = require('./get')
const { createLog } = require('./log')

/**
 * @param {readonly string[]} args
 */
function parse(args) {
  const log = createLog('cli')
  log('parse', args)

  const program = new Command()
  program.name('gat').description('Get Arduino Tools').helpOption(false)

  program
    .command('get')
    .argument('<tool>', `Tool. Can be one of: ${tools.join(', ')}`)
    .argument('<version>', 'Version')
    .option(
      '-d, --destination-folder-path <path>',
      'Destination folder path',
      process.cwd()
    )
    .option('-p, --platform <platform>', 'Platform', process.platform)
    .option('-a, --arch <arch>', 'Architecture', process.arch)
    .option('-f, --force', 'Force download to overwrite existing files', false)
    .option('--verbose', 'Enables the verbose output', false)
    .description('Get an Arduino tool')
    .action(async (tool, version, options) => {
      if (options.verbose === true) {
        enable('gat:*')
      }
      log('Getting tool', tool, version, JSON.stringify(options))

      try {
        const { toolPath } = await getTool({
          tool,
          version,
          ...options,
        })
        log('Tool downloaded to', toolPath)
        console.log(toolPath)
      } catch (err) {
        log('Failed to download tool', err)
        console.log(err?.message || err)
        if (err.code === 'EEXIST' && options.force !== true) {
          console.log('Use --force to overwrite existing files')
        }
      }
    })

  program.parse(args)
}

module.exports = {
  parse,
}
