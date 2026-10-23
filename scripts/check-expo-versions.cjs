const { spawnSync } = require('node:child_process');

// Fail closed on unknown ranges, prereleases, downgrades and major/minor mismatches.
function onlyNewerPatches(report) {
  return report.upToDate === false && Array.isArray(report.dependencies) && report.dependencies.length > 0 &&
    report.dependencies.every(({ actualVersion, expectedVersionOrRange }) => {
      const actual = /^(\d+)\.(\d+)\.(\d+)$/.exec(actualVersion);
      const expected = /^[~^](\d+)\.(\d+)\.(\d+)$/.exec(expectedVersionOrRange);
      return actual && expected && actual[1] === expected[1] && actual[2] === expected[2] &&
        Number(actual[3]) < Number(expected[3]);
    });
}

function main() {
  const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'install', '--check', '--json'], {
    encoding: 'utf8', env: { ...process.env, CI: '1', EXPO_DEBUG: '0' },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  // Expo may print informational lines before its JSON report.
  const json = result.stdout.match(/\{[\s\S]*\}/)?.[0];
  const report = JSON.parse(json ?? 'null');
  if (result.status === 0 && report?.upToDate === true) return;
  if (result.status === 1 && report && onlyNewerPatches(report)) {
    console.warn('Newer Expo patch versions are available; continuing CI.');
    return;
  }
  process.exitCode = 1;
}

module.exports = { onlyNewerPatches };
if (require.main === module) main();
