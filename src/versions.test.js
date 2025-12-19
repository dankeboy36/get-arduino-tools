import { tools } from './tools.js'
import versions from './versions.js'

describe('versions', () => {
  tools.map((tool) =>
    it(`${tool} has a latest version`, () =>
      expect(versions.getLatestVersion(tool)).toBeDefined())
  )
})
