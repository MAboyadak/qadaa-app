const { test } = require('node:test');
const assert = require('node:assert/strict');
const { onlyNewerPatches } = require('./check-expo-versions.cjs');
const report = (actualVersion, expectedVersionOrRange) => ({
  upToDate: false, dependencies: [{ actualVersion, expectedVersionOrRange }],
});

test('accepts only newer patches within the same major and minor', () => {
  assert.ok(onlyNewerPatches(report('58.0.12', '~58.0.14')));
  for (const [actual, expected] of [
    ['58.0.14', '~58.0.12'], ['58.0.12', '~58.1.14'], ['57.0.12', '^58.0.14'],
    ['58.0.12-beta.1', '~58.0.14'], ['58.0.12', '>=58.0.14'], ['58.0.14', '~58.0.14'],
  ]) assert.ok(!onlyNewerPatches(report(actual, expected)));
});

test('does not tolerate missing, empty or mixed reports', () => {
  assert.ok(!onlyNewerPatches({}));
  assert.ok(!onlyNewerPatches({ upToDate: false, dependencies: [] }));
  assert.ok(!onlyNewerPatches({ upToDate: true, dependencies: report('58.0.12', '~58.0.14').dependencies }));
  assert.ok(!onlyNewerPatches({ upToDate: false, dependencies: [
    ...report('58.0.12', '~58.0.14').dependencies, ...report('58.0.12', '~59.0.14').dependencies,
  ] }));
});
