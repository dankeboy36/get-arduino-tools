import debugModule from 'debug'

import { createLog } from './log.js'

const mockLog = /** @type {any} */ (vi.fn())
const debugSpy = vi
  .spyOn(debugModule, 'debug')
  .mockImplementation(() => mockLog)

describe('log', () => {
  beforeEach(() => {
    mockLog.mockClear()
    debugSpy.mockClear()
  })

  it('should create a namespaced logger', () => {
    createLog('test')
    expect(debugSpy).toHaveBeenCalledWith('gat:test')
  })

  it('should log', () => {
    const log = createLog('test')
    log('message', 'arg1', 'arg2')
    expect(mockLog).toHaveBeenCalledWith('message', 'arg1', 'arg2')
  })
})
