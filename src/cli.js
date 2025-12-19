import path from 'node:path'

import { Command } from 'commander'
import debug from 'debug'
import ProgressBar from 'progress'

import getModule from './get.js'
import logModule from './log.js'

/** @param {readonly string[]} args */
function parse(args) {
  const log = logModule.createLog('cli')
  log('parse', args)

  const program = new Command()
  program.name('gat').description('Get Arduino Tools').helpOption(false)

  program
    .command('get')
    .argument('<tool>', `Tool. Can be one of: ${getModule.tools.join(', ')}`)
    .argument('[version]', 'Version (defaults to latest)')
    .allowExcessArguments(false)
    .option(
      '-d, --destination-folder-path <path>',
      'Destination folder path',
      process.cwd()
    )
    .option('-p, --platform <platform>', 'Platform', process.platform)
    .option('-a, --arch <arch>', 'Architecture', process.arch)
    .option('-f, --force', 'Force download to overwrite existing files', false)
    .option(
      '--ok-if-exists',
      'If the tool already exists, skip download and exit with code 0',
      false
    )
    .option('--verbose', 'Enables the verbose output', false)
    .option('--silent', 'Disables the progress bar', false)
    .description('Get an Arduino tool')
    .action(async (tool, version, options, command) => {
      if (command.args.length > 2) return

      if (options.verbose === true) {
        debug.enable('gat:*')
      }
      log('Getting tool', tool, version, JSON.stringify(options))

      /** @type {import('./index.js').GetToolParams['onProgress']} */
      let onProgress = () => {}
      if (options.silent !== true) {
        const bar = new ProgressBar(
          `Downloading ${tool} [:bar] :rate/bps :percent :etas`,
          {
            complete: '=',
            incomplete: ' ',
            total: 100,
          }
        )
        let prev = 0
        onProgress = ({ current }) => {
          const diff = current - prev
          if (diff > 0) {
            prev = current
            bar.tick(diff)
          }
        }
      }

      if (
        options.destinationFolderPath &&
        !path.isAbsolute(options.destinationFolderPath)
      ) {
        options.destinationFolderPath = path.resolve(
          process.cwd(),
          options.destinationFolderPath
        )
      }

      try {
        const { toolPath } = await getModule.getTool({
          tool,
          version,
          onProgress,
          ...options,
        })
        log('Tool downloaded to', toolPath)
        console.log(toolPath)
      } catch (err) {
        log('Failed to download tool', err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.log(errorMessage)
        if (
          err instanceof Error &&
          'code' in err &&
          err.code === 'EEXIST' &&
          options.force !== true
        ) {
          return program.error('Use --force to overwrite existing files')
        }
        return program.error(errorMessage)
      }
    })

  program.parse(args)
}

export { parse }

export default {
  parse,
}
