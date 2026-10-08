const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crossSpawn = require(path.join(__dirname, 'node_modules/npm/node_modules/cross-spawn'));
test('bundled process launcher executes a real child process', () => {
  const result = crossSpawn.sync(process.execPath, ['-e', 'process.stdout.write("worker-ready")']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.toString(), 'worker-ready');
});
