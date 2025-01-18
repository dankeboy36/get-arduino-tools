import { Command } from 'commander'

import { getTool, tools } from './get.js'
import { createLog } from './log.js'

const log = createLog('cli')

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
  .description('Get an Arduino tool')
  .action(async (tool, version, options) => {
    log('Getting tool', tool, version, JSON.stringify(options))
    const { toolPath } = await getTool({
      tool,
      version,
      ...options,
    })
    log('Tool downloaded to', toolPath)
    console.log(`Tool downloaded to ${toolPath}`)
  })

log('parse', process.argv)
program.parse(process.argv)
