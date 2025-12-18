import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import stream from 'node:stream'
import streamPromises from 'node:stream/promises'

import downloadModule from './download.js'
import extractModule from './extract.js'
import logModule from './log.js'
import progressModule from './progress.js'
import toolsModule from './tools.js'

const { Transform } = stream
const { ProgressCounter } = progressModule

/** @type {typeof import('./index.js').getTool} */
async function getTool({
  tool,
  version,
  destinationFolderPath,
  platform = process.platform,
  arch = process.arch,
  force = false,
  onProgress = () => {},
  okIfExists = false,
  signal,
}) {
  const log = logModule.createLog('getTool')

  const url = toolsModule.getDownloadUrl({
    tool,
    version,
    platform,
    arch,
  })

  /** @type {(() => Promise<void>) | undefined} */
  let toCleanupOnError

  const basename = toolsModule.createToolBasename({ tool, platform })
  log('Basename for', tool, platform, 'is', basename)
  const destinationPath = path.join(destinationFolderPath, basename)
  log('Destination path', destinationPath)
  // w opens for write truncates the files
  // wx  creates the file on open fails when already exists
  const flags = force ? 'w' : 'wx'
  const mode = 511 // decimal equivalent of '0o777'

  try {
    log('Ensuring destination folder', destinationFolderPath)
    await fs.mkdir(destinationFolderPath, { recursive: true })

    log('Opening destination file', destinationPath, flags, mode)
    const destinationFd = await fs.open(destinationPath, flags, mode)
    if (!force) {
      toCleanupOnError = () => fs.unlink(destinationPath)
    }
    const destination = destinationFd.createWriteStream()

    const downloadResult = await downloadModule.download({ url, signal })

    const counter = new ProgressCounter(downloadResult.length)
    counter.on('progress', onProgress)

    const archiveType = toolsModule.getArchiveType({ tool, platform })
    log('Got archive type', archiveType, 'from', tool, platform)

    const transformWithProgress = new Transform({
      transform: (chunk, _, next) => {
        counter.onDownload(chunk.length)
        next(null, chunk)
      },
    })
    const extractResult = await extractModule.extract({
      source: downloadResult.body.pipe(transformWithProgress),
      archiveType,
      counter,
    })

    const sourcePath = path.join(extractResult.destinationPath, basename)
    const source = fsSync.createReadStream(sourcePath)

    try {
      log('Piping from', sourcePath, 'to', destinationPath)
      await streamPromises.pipeline(source, destination, { signal })
      log('Piping completed')
      toCleanupOnError = undefined
    } finally {
      await extractResult.cleanup()
    }

    return { toolPath: destinationPath }
  } catch (err) {
    if (
      err instanceof Error &&
      'code' in err &&
      err.code === 'EEXIST' &&
      okIfExists
    ) {
      log('Tool already exists and is executable, skipping download')
      return { toolPath: destinationPath }
    }

    log('Failed to download from', url, err)
    throw err
  } finally {
    await toCleanupOnError?.()
  }
}

export { getTool }
export const tools = toolsModule.tools

export default {
  tools,
  getTool,
}
