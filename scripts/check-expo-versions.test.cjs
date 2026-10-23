const { test } = require('node:test');
const assert = require('node:assert/strict');
const { onlyNewerPatches } = require('./check-expo-versions.cjs');
const report = (actualVersion, expectedVersionOrRange) => ({
  upToDate: false, dependencies: [{ actualVersion, expectedVersionOrRange }],
});

test('accepts only newer patches within the same major and minor', () => {
  assert.ok(onlyNewerPatches(report('58.0.12', '~58.0.14')));
  assert.ok(onlyNewerPatches(report('58.0.12', '^58.0.14')));
  for (const [actual, expected] of [
    ['58.0.14', '~58.0.12'], ['58.0.12', '~58.1.14'], ['57.0.12', '^58.0.14'],
    ['58.0.12-beta.1', '~58.0.14'], ['58.0.12', '>=58.0.14'], ['58.0.14', '~58.0.14'],
  ]) assert.ok(!onlyNewerPatches(report(actual, expected)));
});

test('does not tolerate patch mismatches for exact pins', () => {
  for (const expected of ['0.88.0', '19.3.0', '4.7.1', '0.13.0']) {
    const [major, minor, patch] = expected.split('.').map(Number);
    for (const actualPatch of [patch - 1, patch + 1]) {
      if (actualPatch >= 0) assert.ok(!onlyNewerPatches(report(`${major}.${minor}.${actualPatch}`, expected)));
    }
  }
  assert.ok(!onlyNewerPatches({ upToDate: false, dependencies: [
    ...report('58.0.12', '~58.0.14').dependencies, ...report('4.7.0', '4.7.1').dependencies,
  ] }));
});

test('does not tolerate missing, empty or mixed reports', () => {
  assert.ok(!onlyNewerPatches({}));
  assert.ok(!onlyNewerPatches({ upToDate: false, dependencies: [] }));
  assert.ok(!onlyNewerPatches({ upToDate: true, dependencies: report('58.0.12', '~58.0.14').dependencies }));
  assert.ok(!onlyNewerPatches({ upToDate: false, dependencies: [
    ...report('58.0.12', '~58.0.14').dependencies, ...report('58.0.12', '~59.0.14').dependencies,
  ] }));
});
