module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Shim `import.meta` so the classic-script web bundle executes (see file).
    plugins: ['./babel-plugin-import-meta-shim.js'],
    // Note: the worklets babel plugin (react-native-worklets/plugin) is added
    // automatically by nativewind/babel (css-interop) for Reanimated 4.
  };
};
