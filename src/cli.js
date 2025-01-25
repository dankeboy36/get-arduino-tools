import { Command } from 'commander'
import { enable } from 'debug'

import { getTool, tools } from './get.js'
import { createLog } from './log.js'

/**
 * @param {readonly string[]} args
 */
export function parse(args) {
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
      log('Getting tool', tool, version, JSON.stringify(options))
      if (options.verbose === true) {
        enable('gat:*')
      }
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
      }
    })

  program.parse(args)
}
