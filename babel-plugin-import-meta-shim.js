/**
 * Replaces `import.meta` with `({ env: {} })`.
 *
 * Some dependencies use Vite-style `import.meta.env.MODE`. In the web export
 * the bundle is loaded as a classic <script>, where `import.meta` is a syntax
 * error and prevents the whole bundle from executing (white screen). This shim
 * turns it into a harmless object so those dev/prod checks resolve to "prod".
 */
module.exports = function importMetaShim({ types: t }) {
  return {
    name: 'import-meta-shim',
    visitor: {
      MetaProperty(path) {
        const node = path.node;
        if (node.meta && node.meta.name === 'import' && node.property.name === 'meta') {
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(t.identifier('env'), t.objectExpression([])),
            ])
          );
        }
      },
    },
  };
};
