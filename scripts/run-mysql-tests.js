'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const testFile = path.join('tests', 'integration', 'mysql.test.js');
const result = spawnSync(process.execPath, ['--test', testFile], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, RUN_MYSQL_TESTS: '1' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
