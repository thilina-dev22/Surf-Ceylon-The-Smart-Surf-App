try {
  const rnPkg = require.resolve('react-native/package.json');
  const resolved = require.resolve('@react-native/gradle-plugin/package.json', { paths: [rnPkg] });
  console.log(resolved);
} catch (e) {
  console.error('RESOLVE_ERROR:', e && e.message ? e.message : e);
  process.exit(25);
}
