import { getTool, tools } from './index.js'

describe('index', () => {
  it('should export the getTool function', () => {
    expect(typeof getTool).toBe('function')
  })

  it('should export the tools array', () => {
    expect(Array.isArray(tools)).toBe(true)
    expect(tools).toContain('arduino-cli')
    expect(tools).toContain('clangd')
  })
})
