import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { extractFile } from './extract-file.mjs';

function zipOne(name, value) {
  const nameBytes = Buffer.from(name), data = Buffer.from(value), compressed = deflateRawSync(data);
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(0, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26); nameBytes.copy(local, 30);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(0, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(0, 42); nameBytes.copy(central, 46);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length + compressed.length, 16);
  return Buffer.concat([local, compressed, central, eocd]);
}

function makePdf(text = '') {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let body = '%PDF-1.4\n', offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(body)); body += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n` + offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

test('extracts UTF-8 plain text and reports format and byte metadata', async () => {
  const result = await extractFile(Buffer.from('\uFEFFPrivacy terms\r\n\r\nWe retain data.'), { filename: 'policy.TXT' });
  assert.equal(result.text, 'Privacy terms\n\nWe retain data.');
  assert.equal(result.format, 'txt');
  assert.equal(result.metadata.bytes, Buffer.byteLength('\uFEFFPrivacy terms\r\n\r\nWe retain data.'));
  assert.deepEqual(result.warnings, []);
});

test('decodes RTF paragraphs, escaped punctuation, and Unicode', async () => {
  const src = String.raw`{\rtf1\ansi\deff0 First \b important\b0.\par Second \u945? clause \{kept\}.}`;
  const result = await extractFile(Buffer.from(src), { filename: 'terms.rtf' });
  assert.equal(result.text, 'First important.\nSecond α clause {kept}.');
  assert.equal(result.format, 'rtf');
});

test('extracts DOCX paragraphs and Word text breaks', async () => {
  const xml = '<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Data use</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">We collect </w:t><w:t>account data &amp; logs.</w:t></w:r><w:br/><w:r><w:t>See retention.</w:t></w:r></w:p></w:body></w:document>';
  const result = await extractFile({ bytes: zipOne('word/document.xml', xml), filename: 'terms.docx' });
  assert.equal(result.text, 'Data use\nWe collect account data & logs.\nSee retention.');
  assert.equal(result.format, 'docx');
  assert.ok(result.warnings[0].includes('headers'));
});

test('rejects unsupported types and byte overages with stable error codes', async () => {
  await assert.rejects(extractFile(Buffer.from('x'), { filename: 'terms.html' }), { code: 'ERR_UNSUPPORTED_FILE_TYPE' });
  await assert.rejects(extractFile(Buffer.from('12345'), { filename: 'terms.txt', maxBytes: 4 }), { code: 'ERR_FILE_TOO_LARGE' });
});

test('rejects empty text and malformed DOCX clearly', async () => {
  await assert.rejects(extractFile(Buffer.from('  '), { filename: 'empty.txt' }), { code: 'ERR_NO_TEXT' });
  await assert.rejects(extractFile(Buffer.from('not a zip'), { filename: 'broken.docx' }), { code: 'ERR_INVALID_DOCX' });
});

test('rejects encrypted PDFs before attempting extraction', async () => {
  await assert.rejects(extractFile(Buffer.from('%PDF-1.4\ntrailer << /Root 1 0 R /Encrypt 7 0 R >>'), { filename: 'locked.pdf' }), { code: 'ERR_ENCRYPTED_PDF' });
});

test('extracts text PDF content and rejects scanned PDFs without claiming OCR', async () => {
  const result = await extractFile(makePdf('Privacy terms'), { filename: 'terms.pdf' });
  assert.match(result.text, /Privacy terms/);
  assert.equal(result.format, 'pdf');
  await assert.rejects(extractFile(makePdf(), { filename: 'scan.pdf' }), { code: 'ERR_PDF_NO_TEXT' });
});
