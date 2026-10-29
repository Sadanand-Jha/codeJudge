import assert from "node:assert/strict";
import {
  CryptoError,
  ENVELOPE_VERSION,
  PBKDF2_MIN_ITERATIONS,
  answerKeyAad,
  base64UrlToBytes,
  bytesToBase64Url,
  createKdfParams,
  decryptJson,
  deriveKek,
  encryptJson,
  exportDekB64Url,
  generateDek,
  importDekB64Url,
  isEnvelope,
  makeKekCheck,
  questionPayloadAad,
  randomBytes,
  unwrapDek,
  verifyKekCheck,
  wrapDek,
  wrappedDekAad,
  type Envelope,
} from "../index";

const PASSPHRASE = "correct horse battery staple";

function expectCryptoError(code: string) {
  return (error: unknown) =>
    error instanceof CryptoError && error.code === code;
}

async function main() {
  const bytes = randomBytes(96);
  const encoded = bytesToBase64Url(bytes);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.equal(encoded.includes("="), false);
  assert.deepEqual(base64UrlToBytes(encoded), bytes);

  const dek = await generateDek();
  const aad = questionPayloadAad("quiz-42", "question-7");
  assert.equal(aad, "quiz:quiz-42|q:question-7|payload|v1");
  assert.equal(answerKeyAad("quiz-42", "question-7"), "quiz:quiz-42|q:question-7|key|v1");
  assert.equal(wrappedDekAad("quiz-42"), "quiz:quiz-42|dek|v1");

  const payload = { title: "Private quiz", questions: [{ id: "q1", text: "2 + 2?" }] };
  const envelope = await encryptJson(dek, payload, aad);
  assert.equal(isEnvelope(envelope), true);
  assert.equal(JSON.stringify(envelope).includes("2 + 2"), false);
  assert.deepEqual(await decryptJson(dek, envelope, aad), payload);

  await assert.rejects(
    () => decryptJson(dek, envelope, questionPayloadAad("quiz-42", "question-8")),
    expectCryptoError("DECRYPT_FAILED")
  );

  const tamperedBytes = base64UrlToBytes(envelope.ct);
  tamperedBytes[0] ^= 0x01;
  await assert.rejects(
    () =>
      decryptJson(
        dek,
        { ...envelope, ct: bytesToBase64Url(tamperedBytes) },
        aad
      ),
    expectCryptoError("DECRYPT_FAILED")
  );

  const otherDek = await generateDek();
  await assert.rejects(
    () => decryptJson(otherDek, envelope, aad),
    expectCryptoError("DECRYPT_FAILED")
  );

  await assert.rejects(
    () => decryptJson(dek, { ...envelope, v: 2 } as unknown as Envelope, aad),
    expectCryptoError("UNSUPPORTED_VERSION")
  );

  await assert.rejects(
    () =>
      decryptJson(
        dek,
        { ...envelope, alg: "A128GCM" } as unknown as Envelope,
        aad
      ),
    expectCryptoError("UNSUPPORTED_ALGORITHM")
  );

  const wrapAad = wrappedDekAad("quiz-42");
  const params = createKdfParams();
  assert.equal(params.iterations, PBKDF2_MIN_ITERATIONS);
  assert.equal(base64UrlToBytes(params.salt).length >= 16, true);

  const kek = await deriveKek(PASSPHRASE, params);
  const sameKek = await deriveKek(PASSPHRASE, params);
  const wrapped = await wrapDek(dek, kek, wrapAad);
  const unwrapped = await unwrapDek(wrapped, kek, wrapAad);
  assert.equal(await exportDekB64Url(unwrapped), await exportDekB64Url(dek));

  await assert.rejects(
    () => unwrapDek(wrapped, sameKek, wrappedDekAad("quiz-43")),
    expectCryptoError("DECRYPT_FAILED")
  );

  const check = await makeKekCheck(kek);
  assert.equal(await verifyKekCheck(kek, check), true);
  assert.equal(await verifyKekCheck(sameKek, check), true);
  const wrongKek = await deriveKek("this is the wrong passphrase", params);
  assert.equal(await verifyKekCheck(wrongKek, check), false);

  const dekB64 = await exportDekB64Url(dek);
  const importedDek = await importDekB64Url(dekB64, ["decrypt", "encrypt"]);
  assert.deepEqual(await decryptJson(importedDek, envelope, aad), payload);
  await assert.rejects(() => crypto.subtle.exportKey("raw", importedDek));

  const ivs = new Set<string>();
  for (let index = 0; index < 64; index += 1) {
    const item = await encryptJson(dek, { index }, aad);
    ivs.add(item.iv);
  }
  assert.equal(ivs.size, 64);

  assert.throws(
    () => createKdfParams(PBKDF2_MIN_ITERATIONS - 1),
    expectCryptoError("WEAK_KDF")
  );
  await assert.rejects(
    () => deriveKek("short", params),
    expectCryptoError("PASSPHRASE_TOO_SHORT")
  );

  const checkFromOtherKek = await makeKekCheck(wrongKek);
  assert.equal(await verifyKekCheck(kek, checkFromOtherKek), false);
  assert.equal(check.v, ENVELOPE_VERSION);

  await assert.rejects(
    () => decryptJson(dek, { v: 1, alg: "A256GCM", iv: "not-valid!", ct: "abc" }, aad),
    expectCryptoError("INVALID_ENVELOPE")
  );

  console.log("crypto module: ok");
}

void main();
