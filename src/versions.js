/** @type {Record<import('./index.js').Tool, string>} */
export const latestVersions = {
  'arduino-cli': '1.4.0',
  'arduino-language-server': '0.7.7',
  'arduino-fwuploader': '2.4.1',
  'arduino-lint': '1.3.0',
  clangd: '15.0.0',
  'clang-format': '15.0.0',
}

export default {
  getLatestVersion: (/** @type {import('./index.js').Tool} */ tool) =>
    latestVersions[tool],
}
