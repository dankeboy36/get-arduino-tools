// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const arduinoTools: readonly [
  'arduino-cli',
  'arduino-language-server',
  'arduino-fwuploader',
  'arduino-lint',
]
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const clangTools: readonly ['clangd', 'clang-format']

export declare type ArduinoTool = (typeof arduinoTools)[number]
export declare type ClangTool = (typeof clangTools)[number]
export declare type Tool = ArduinoTool | ClangTool

export declare const tools: readonly Tool[]

export interface OnProgressParams {
  /** A percentage between 0 and 100 */
  current: number
}

export declare interface GetToolParams {
  tool: Tool
  version: string
  destinationFolderPath: string
  platform?: NodeJS.Platform
  arch?: NodeJS.Architecture
  force?: boolean
  onProgress?: (params: Readonly<OnProgressParams>) => void
  signal?: AbortSignal
  okIfExists?: boolean
}

export declare interface GetToolResult {
  toolPath: string
}

export declare function getTool(
  params: Readonly<GetToolParams>
): Promise<Readonly<GetToolResult>>

declare const _default: {
  getTool: typeof getTool
  tools: typeof tools
}

export default _default
