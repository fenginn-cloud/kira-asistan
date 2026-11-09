// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    // Build/CI betikleri Node'da çalışır (sablon-pdf.js ayrıca tarayıcıda da yüklenir).
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { ...require('globals').node, self: 'readonly' } },
  },
]);
