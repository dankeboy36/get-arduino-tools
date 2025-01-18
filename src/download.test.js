import { xhr } from 'request-light'

import { download } from './download.js'

const mockedXhr = jest.mocked(xhr)

jest.mock('request-light', () => ({
  ...jest.requireActual('request-light'),
  xhr: jest.fn(),
}))

describe('download', () => {
  const mockXhr = jest.fn()

  beforeAll(() => {
    mockedXhr.mockImplementation(mockXhr)
  })

  beforeEach(() => {
    mockXhr.mockClear()
  })

  it('should download the tool successfully', async () => {
    const mockBody = new Uint8Array([1, 2, 3])
    mockXhr.mockResolvedValue({ body: mockBody })

    const result = await download({
      tool: 'arduino-cli',
      remoteFilename: 'testArchive.zip',
    })
    expect(result).toEqual(mockBody)
  })

  describe('should throw an error if download fails', () => {
    it('with responseText', async () => {
      const mockError = {
        responseText: 'error response text',
      }
      mockXhr.mockRejectedValue(mockError)

      await expect(
        download({
          tool: 'arduino-cli',
          remoteFilename: 'testArchive.zip',
        })
      ).rejects.toThrow(/error response text/gi)
    })

    it('status', async () => {
      const mockError = {
        status: 404,
      }
      mockXhr.mockRejectedValue(mockError)

      await expect(
        download({
          tool: 'arduino-cli',
          remoteFilename: 'testArchive.zip',
        })
      ).rejects.toThrow(/not found/gi)
    })

    it('error with falsy props', async () => {
      /** @type {Record<string,any>} */
      const mockError = new Error('some error')
      mockError.responseText = ''
      mockError.status = 0
      mockXhr.mockRejectedValue(mockError)

      await expect(
        download({
          tool: 'arduino-cli',
          remoteFilename: 'testArchive.zip',
        })
      ).rejects.toThrow(/some error/gi)
    })

    it('generic error', async () => {
      const mockError = new Error('some error')
      mockXhr.mockRejectedValue(mockError)

      await expect(
        download({
          tool: 'arduino-cli',
          remoteFilename: 'testArchive.zip',
        })
      ).rejects.toThrow(/some error/gi)
    })
  })
})
