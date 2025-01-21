const arduinoTools = [
  'arduino-cli',
  'arduino-language-server',
  'arduino-fwuploader',
] as const
const clangTools = ['clangd', 'clang-format'] as const

export const tools = [...arduinoTools, ...clangTools]

export declare type Tool = (typeof tools)[number]

export declare interface GetToolParams {
  tool: Tool
  version: string
  destinationFolderPath: string
  platform?: NodeJS.Platform
  arch?: NodeJS.Architecture
  force?: boolean
}

export declare interface GetToolResult {
  toolPath: string
}

export declare function getTool(params: GetToolParams): Promise<GetToolResult>
