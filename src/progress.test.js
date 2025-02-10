const ProgressCounter = require('./progress')

describe('ProgressCounter', () => {
  it('should emit progress events correctly', (done) => {
    const totalLength = 100
    const progressCounter = new ProgressCounter(totalLength)
    const chunks = [10, 20, 30, 40]
    const expectedProgress = [10, 30, 60, 100].map((current) => ({ current }))
    let progressIndex = 0

    progressCounter.on('progress', (progress) => {
      expect(progress).toStrictEqual(expectedProgress[progressIndex])
      progressIndex++
      if (progressIndex === expectedProgress.length) {
        done()
      }
    })

    chunks.forEach((chunk) => progressCounter.work(chunk))
  })

  it('should not emit progress if totalLength is zero', () => {
    const totalLength = 0
    const progressCounter = new ProgressCounter(totalLength)
    const chunks = [10, 20, 30, 40]
    let progressEmitted = false

    progressCounter.on('progress', () => {
      progressEmitted = true
    })

    chunks.forEach((chunk) => progressCounter.work(chunk))
    expect(progressEmitted).toBe(false)
  })

  it('should handle large chunks correctly', (done) => {
    const totalLength = 100
    const progressCounter = new ProgressCounter(totalLength)
    const chunks = [50, 50]
    const expectedProgress = [50, 100].map((current) => ({ current }))
    let progressIndex = 0

    progressCounter.on('progress', (progress) => {
      expect(progress).toStrictEqual(expectedProgress[progressIndex])
      progressIndex++
      if (progressIndex === expectedProgress.length) {
        done()
      }
    })

    chunks.forEach((chunk) => progressCounter.work(chunk))
  })

  it('should not emit progress if nextPercentage is not greater than currentPercentage', () => {
    const totalLength = 1000000
    const progressCounter = new ProgressCounter(totalLength)
    const chunks = [10, 10, 10]
    const expectedProgress = [10]
    let progressIndex = 1

    progressCounter.on('progress', (progress) => {
      expect(progress).toBe(expectedProgress[progressIndex])
      progressIndex++
    })

    chunks.forEach((chunk) => progressCounter.work(chunk))
    expect(progressIndex).toBe(expectedProgress.length)
  })
})
