import { execFile as execFileCallback } from 'node:child_process'

import { execFile } from './execFile'

const mockedExecFileCallback = jest.mocked(execFileCallback)

jest.mock('node:child_process', () => ({
  ...jest.requireActual('node:child_process'),
  execFile: jest.fn((_file, _args, callback) => {
    callback(null, { stdout: 'execution output', stderr: '' })
  }),
}))

describe('execFile', () => {
  beforeEach(() => {
    mockedExecFileCallback.mockReset()
  })

  it('should execute the file successfully', async () => {
    const mockStdout = ' untrimmed output '
    mockedExecFileCallback.mockImplementation((_file, _args, callback) =>
      callback(null, { stdout: mockStdout, stderr: '' })
    )

    const result = await execFile('testFile', ['arg1', 'arg2'])

    expect(result).toEqual(mockStdout.trim())
    expect(mockedExecFileCallback).toHaveBeenCalledWith(
      'testFile',
      ['arg1', 'arg2'],
      expect.any(Function)
    )
  })

  it('should throw an error if there is stderr output', async () => {
    const mockStderr = 'error output'
    mockedExecFileCallback.mockImplementation((_file, _args, callback) =>
      callback(null, { stdout: '', stderr: mockStderr })
    )

    await expect(execFile('testFile', [])).rejects.toThrow(mockStderr)
  })

  it('should re-throw the error', async () => {
    const mockError = new Error('an error')
    mockedExecFileCallback.mockImplementation((_file, _args, callback) =>
      callback(mockError, { stdout: '', stderr: '' })
    )

    await expect(execFile('testFile', [])).rejects.toThrow(mockError)
  })
})
