import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/platform/school-access.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const { schoolAccessAllowed, schoolBanDuration } = mod.exports;
test('inactive overrides approved registration', () => {
  assert.equal(schoolAccessAllowed({ account_status: 'approved', account_active: false }), false);
});
test('active does not bypass pending or rejected registration', () => {
  for (const account_status of ['pending', 'rejected', undefined]) {
    assert.equal(schoolAccessAllowed({ account_status, account_active: true }), false);
    assert.equal(schoolBanDuration(true, account_status), '876000h');
  }
});
test('existing approved accounts default to active', () => {
  assert.equal(schoolAccessAllowed({ account_status: 'approved' }), true);
});
test('reactivation allows approved accounts only and respects other bans', () => {
  assert.equal(schoolBanDuration(true, 'approved'), 'none');
  assert.equal(schoolBanDuration(false, 'approved'), '876000h');
  assert.equal(schoolAccessAllowed({ account_status: 'approved', account_active: true }), true);
  assert.equal(schoolAccessAllowed({ account_status: 'approved' }, '2999-01-01'), false);
});
