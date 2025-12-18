import childProcess from 'node:child_process'

import { execFile } from './execFile.js'

const execFileSpy = vi
  .spyOn(childProcess, 'execFile')
  .mockImplementation((_file, _args, callback) => {
    callback(null, { stdout: 'execution output', stderr: '' })
  })

describe('execFile', () => {
  beforeEach(() => {
    execFileSpy.mockReset()
    execFileSpy.mockImplementation((_file, _args, callback) => {
      callback(null, { stdout: 'execution output', stderr: '' })
    })
  })

  it('should execute the file successfully', async () => {
    const mockStdout = ' untrimmed output '
    execFileSpy.mockImplementation((_file, _args, callback) =>
      callback(null, { stdout: mockStdout, stderr: '' })
    )

    const result = await execFile('testFile', ['arg1', 'arg2'])

    expect(result).toEqual(mockStdout.trim())
    expect(execFileSpy).toHaveBeenCalledWith(
      'testFile',
      ['arg1', 'arg2'],
      expect.any(Function)
    )
  })

  it('should use an empty array as the default args', async () => {
    execFileSpy.mockImplementation((_file, _args, callback) =>
      callback(null, { stdout: '', stderr: '' })
    )

    await execFile('testFile')

    expect(execFileSpy).toHaveBeenCalledWith(
      'testFile',
      [],
      expect.any(Function)
    )
  })

  it('should re-throw the error', async () => {
    const mockError = new Error('an error')
    execFileSpy.mockImplementation((_file, _args, callback) =>
      callback(mockError, { stdout: '', stderr: '' })
    )

    await expect(execFile('testFile', [])).rejects.toThrow(mockError)
  })

  it('should return the stderr when errors with canError', async () => {
    const mockError = Object.assign(new Error('an error'), { stderr: 'stderr' })
    execFileSpy.mockImplementation((_file, _args, callback) =>
      callback(mockError, { stdout: '', stderr: '' })
    )

    const result = await execFile('testFile', [], true)
    expect(result).toEqual('stderr')
  })
})
