import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('lib/school-form-client.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('exports', 'module', source)(mod.exports, mod);
const { prepareSchoolForm, readSchoolFormResponse, schoolFormErrorMessage } = mod.exports;
function form(file) {
  const data = new FormData();
  data.set('payload', '{"schoolName":"Example"}');
  data.set('password', 'not-sent-twice');
  if (file) data.set('government:Elementary:approvedPermit', file);
  return data;
}
test('rejects oversized files before submitting the request', () => {
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'permit.pdf', { type: 'application/pdf' });
  assert.throws(() => prepareSchoolForm(form(file)), /permit.pdf.*1 MB/);
});
test('rejects unsupported file types', () => {
  assert.throws(() => prepareSchoolForm(form(new File(['text'], 'permit.txt', { type: 'text/plain' }))), /PDF, JPG, or PNG/);
});
test('keeps payload and document without duplicating ordinary form inputs', () => {
  const file = new File(['%PDF-1.7'], 'permit.pdf', { type: 'application/pdf' });
  const result = prepareSchoolForm(form(file));
  assert.equal(result.get('payload'), '{"schoolName":"Example"}');
  assert.equal(result.get('password'), null);
  assert.equal(result.get('government:Elementary:approvedPermit').name, 'permit.pdf');
});
test('handles non-JSON upload rejection without leaking a browser parsing error', async () => {
  await assert.rejects(readSchoolFormResponse(new Response('Request Entity Too Large', { status: 413 })), /1 MB/);
});
test('handles HTML server errors and malformed successful responses', async () => {
  await assert.rejects(readSchoolFormResponse(new Response('<html>Bad Gateway</html>', { status: 502 })), /error 502/);
  await assert.rejects(readSchoolFormResponse(new Response('not json')), /check whether.*saved/);
});
test('preserves server validation messages and successful saved statuses', async () => {
  await assert.rejects(readSchoolFormResponse(Response.json({ error: 'Email already registered.' }, { status: 400 })), /Email already registered/);
  const body = { schoolStatuses: { esc: { status: 'Non-Participating School', details: {} } } };
  assert.deepEqual(await readSchoolFormResponse(Response.json(body)), body);
});
test('turns browser syntax and network failures into actionable messages', () => {
  assert.match(schoolFormErrorMessage(new SyntaxError('The string did not match the expected pattern.')), /Check your connection/);
  assert.match(schoolFormErrorMessage(new TypeError('Load failed')), /entries have been kept/);
});
