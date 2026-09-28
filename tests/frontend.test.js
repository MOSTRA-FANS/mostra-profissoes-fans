'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

test('formulario da Mostra possui os campos do contrato e integracao com a API', async () => {
  const root = path.join(__dirname, '..');
  const html = await readFile(path.join(root, 'inscricao.html'), 'utf8');
  const script = await readFile(path.join(root, 'js', 'subscription.js'), 'utf8');

  for (const field of ['nome', 'idade', 'telefone', 'email', 'curso', 'novo', 'outro', 'novidade', 'feedback', 'saber']) {
    assert.match(html, new RegExp(`name=["']${field}["']`));
  }
  assert.match(script, /\/courses/);
  assert.match(script, /\/subscriptions/);
  assert.match(script, /method:\s*'POST'/);
  assert.match(script, /response\.ok/);
});

test('cadastro inicial da home transfere nome e e-mail para a inscricao completa', async () => {
  const root = path.join(__dirname, '..');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const script = await readFile(path.join(root, 'js', 'subscription.js'), 'utf8');

  assert.match(html, /id="interest-start"/);
  assert.match(html, /sessionStorage\.setItem\('mostra-registration-draft'/);
  assert.match(html, /window\.location\.href = 'inscricao\.html'/);
  assert.match(script, /sessionStorage\.getItem\('mostra-registration-draft'/);
  assert.match(script, /form\.elements\.nome\.value = draft\.nome/);
  assert.match(script, /form\.elements\.email\.value = draft\.email/);
});
