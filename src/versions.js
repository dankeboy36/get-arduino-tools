/** @type {Record<import('./index.js').Tool, string>} */
const latestVersions = {
  'arduino-cli': '1.5.1',
  'arduino-language-server': '0.7.7',
  'arduino-fwuploader': '2.4.1',
  'arduino-lint': '1.3.0',
  clangd: '22.1.8',
  'clang-format': '22.1.8',
}

export default {
  getLatestVersion: (/** @type {import('./index.js').Tool} */ tool) =>
    latestVersions[tool],
}
