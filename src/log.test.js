import debug from 'debug'

import { createLog } from './log.js'

const mockLog = jest.fn()
jest.mock('debug', () => jest.fn(() => mockLog))

describe('log', () => {
  beforeEach(() => {
    mockLog.mockClear()
  })

  it('should create a namespaced logger', () => {
    createLog('test')
    expect(debug).toHaveBeenCalledWith('gat:test')
  })

  it('should log', () => {
    const log = createLog('test')
    log('message', 'arg1', 'arg2')
    expect(mockLog).toHaveBeenCalledWith('message', 'arg1', 'arg2')
  })
})
