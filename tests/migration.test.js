'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

test('executor de migrations aceita arquivos SQL com múltiplas instruções', () => {
  const previous = {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
  };

  Object.assign(process.env, {
    DB_HOST: '127.0.0.1',
    DB_USER: 'migration_test',
    DB_PASSWORD: 'migration_test_password',
    DB_NAME: 'migration_test_database',
  });

  try {
    const { requireDatabaseConfig } = require('../scripts/migrate');
    const config = requireDatabaseConfig();
    assert.equal(config.multipleStatements, true);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
