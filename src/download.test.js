import stream from 'node:stream'
import webStream from 'node:stream/web'

import requestLightStream from 'request-light-stream'

import { download } from './download.js'

const { Readable } = stream
const { ReadableStream } = webStream

describe('download', () => {
  const url = ''
  const mockXhr = vi.fn()
  /** @type {import('vitest').MockInstance} */
  let xhrSpy

  beforeAll(() => {
    xhrSpy = vi.spyOn(requestLightStream, 'xhr').mockImplementation(mockXhr)
  })

  afterAll(() => {
    xhrSpy.mockRestore()
  })

  beforeEach(() => {
    mockXhr.mockClear()
  })

  it('should download the tool successfully', async () => {
    const data = '1, 2, 3, 4, 5'
    const body = createReadStream(data)
    mockXhr.mockResolvedValue({ body, status: 200 })

    const result = await download({ url })

    expect(result.body).toBeInstanceOf(Readable)
    let actualData = ''
    for await (const chunk of result.body) {
      actualData += chunk
    }
    expect(actualData).toStrictEqual(data)
  })

  describe('should throw an error if download fails', () => {
    it('status is not OK', async () => {
      mockXhr.mockResolvedValue({ status: 201 })

      await expect(download({ url })).rejects.toThrow(/unexpected status 201/gi)
    })

    it('has no response body', async () => {
      mockXhr.mockResolvedValue({ status: 200 })

      await expect(download({ url })).rejects.toThrow(/no body/gi)
    })

    it('with responseText', async () => {
      const mockError = {
        responseText: 'error response text',
      }
      mockXhr.mockRejectedValue(mockError)

      await expect(download({ url })).rejects.toThrow(/error response text/gi)
    })

    it('status', async () => {
      const mockError = {
        status: 404,
      }
      mockXhr.mockRejectedValue(mockError)

      await expect(download({ url })).rejects.toThrow(/not found/gi)
    })

    it('error with falsy props', async () => {
      /** @type {Record<string, any>} */
      const mockError = new Error('some error')
      mockError.responseText = ''
      mockError.status = 0
      mockXhr.mockRejectedValue(mockError)

      await expect(download({ url })).rejects.toThrow(/some error/gi)
    })

    it('generic error', async () => {
      const mockError = new Error('some error')
      mockXhr.mockRejectedValue(mockError)

      await expect(download({ url })).rejects.toThrow(/some error/gi)
    })

    it('not an error', async () => {
      const mockError = 'not an error'
      mockXhr.mockRejectedValue(mockError)

      await expect(download({ url })).rejects.toThrow(/not an error/gi)
    })

    it('should handle stream that errors with abort error', async () => {
      const data1 = 'first chunk'
      const data2 = 'second chunk'
      const body = createReadStream(
        [data1, data2],
        new DOMException('AbortError', 'AbortError')
      )
      mockXhr.mockResolvedValue({ body, status: 200 })

      const result = await download({ url })

      expect(result.body).toBeInstanceOf(Readable)
      try {
        let bytesRead = 0
        for await (const chunk of result.body) {
          bytesRead += chunk.length
        }
        throw new Error(`expected broken readable, bytesRead=${bytesRead}`)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        // @ts-ignore
        expect(error.name).toBe('AbortError')
      }
    })

    it('should handle stream that errors unexpectedly', async () => {
      const data1 = 'first chunk'
      const data2 = 'second chunk'
      const body = createReadStream(
        [data1, data2],
        'unexpected error' // not an Error
      )
      mockXhr.mockResolvedValue({ body, status: 200 })

      const result = await download({ url })

      expect(result.body).toBeInstanceOf(Readable)
      try {
        let bytesRead = 0
        for await (const chunk of result.body) {
          bytesRead += chunk.length
        }
        throw new Error(`expected broken readable, bytesRead=${bytesRead}`)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        // @ts-ignore
        expect(error.message).toBe('unexpected error')
      }
    })
  })

  describe('length', () => {
    it('should get the content length from the header (single)', async () => {
      mockXhr.mockResolvedValue({
        body: createReadStream(''),
        status: 200,
        headers: { 'content-length': '36' },
      })

      const result = await download({ url })
      expect(result.length).toBe(36)
    })

    it('should get the content length from the header (array)', async () => {
      mockXhr.mockResolvedValue({
        body: createReadStream(''),
        status: 200,
        headers: { 'content-length': ['36', '37'] },
      })

      const result = await download({ url })
      expect(result.length).toBe(36)
    })

    it('should get the content length from the header (capital case)', async () => {
      mockXhr.mockResolvedValue({
        body: createReadStream(''),
        status: 200,
        headers: { 'Content-Length': '36' },
      })

      const result = await download({ url })
      expect(result.length).toBe(36)
    })

    it('should fall back to 0 content length (NaN)', async () => {
      mockXhr.mockResolvedValue({
        body: createReadStream(''),
        status: 200,
        headers: { 'content-length': 'alma' },
      })

      const result = await download({ url })
      expect(result.length).toBe(0)
    })

    it('should fall back to 0 content length (empty)', async () => {
      mockXhr.mockResolvedValue({
        body: createReadStream(''),
        status: 200,
        headers: { 'content-length': '' },
      })

      const result = await download({ url })
      expect(result.length).toBe(0)
    })

    it('should fall back to 0 content length (empty)', async () => {
      mockXhr.mockResolvedValue({
        body: createReadStream(''),
        status: 200,
        headers: { 'other-header': '' },
      })

      const result = await download({ url })
      expect(result.length).toBe(0)
    })
  })

  /**
   * @param {string | string[]} chunk
   * @param {object | undefined} [error=undefined] Default is `undefined`
   */
  function createReadStream(chunk, error = undefined) {
    const chunks = Array.isArray(chunk) ? chunk : [chunk]
    return new ReadableStream({
      start(controller) {
        chunks.forEach((data) =>
          controller.enqueue(new TextEncoder().encode(data))
        )
        if (error) {
          controller.error(error)
        } else {
          controller.close()
        }
      },
    })
  }
})
