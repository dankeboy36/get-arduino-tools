const { EventEmitter } = require('node:events')

class ProgressCounter extends EventEmitter {
  /**
   * @param {number} totalLength
   */
  constructor(totalLength) {
    super()
    this.totalLength = totalLength
    this.processedLength = 0
    this.currentPercentage = 0
  }

  /**
   * @param {number} chunkLength
   */
  work(chunkLength) {
    this.processedLength += chunkLength
    if (this.totalLength) {
      const nextPercentage = Math.trunc(
        (this.processedLength / this.totalLength) * 100
      )
      if (nextPercentage > this.currentPercentage) {
        this.currentPercentage = nextPercentage
        /** @type {import('./index').OnProgressParams} */
        const progressEvent = { current: this.currentPercentage }
        this.emit('progress', progressEvent)
      }
    }
  }
}

module.exports = ProgressCounter
