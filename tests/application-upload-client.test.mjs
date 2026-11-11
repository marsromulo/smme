import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('lib/application-upload-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function uploader(fetch) {
  const mod = { exports: {} };
  new Function('exports', 'fetch', source)(mod.exports, fetch);
  return mod.exports.uploadApplicationDocument;
}
const file = new File(['%PDF test'], 'document.pdf', { type: 'application/pdf' });
const upload = { fileId: 'file-123', uploadUrl: 'https://storage.example/upload' };
test('successful direct upload does not use fallback', async () => {
  const calls = [];
  await uploader(async url => { calls.push(url); return new Response(); })(file, upload);
  assert.deepEqual(calls, [upload.uploadUrl]);
});
test('network failure falls back with the same file and prepared ID', async () => {
  const calls = [];
  await uploader(async (url, options) => {
    calls.push(url);
    if (url === upload.uploadUrl) throw new TypeError('Failed to fetch');
    assert.equal(options.body, file);
    assert.equal(options.method, 'PUT');
    return Response.json({ ok: true });
  })(file, upload);
  assert.deepEqual(calls, [upload.uploadUrl, '/api/platform/application-files/file-123/upload']);
});
test('rejected storage request also uses fallback', async () => {
  let calls = 0;
  await uploader(async () => ++calls === 1 ? new Response(null, { status: 403 }) : Response.json({ ok: true }))(file, upload);
  assert.equal(calls, 2);
});
test('does not send large files through the size-limited fallback', async () => {
  let calls = 0;
  const large = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.pdf');
  await assert.rejects(uploader(async () => { calls++; throw new TypeError(); })(large, upload), /without www/);
  assert.equal(calls, 1);
});
test('fallback network failure gives actionable feedback', async () => {
  await assert.rejects(uploader(async () => { throw new TypeError('Failed to fetch'); })(file, upload), /selected files have been kept/);
});
test('fallback retains authorization errors', async () => {
  await assert.rejects(uploader(async url => url === upload.uploadUrl ? new Response(null, { status: 403 }) : Response.json({ error: 'Forbidden' }, { status: 403 }))(file, upload), /Forbidden/);
});
