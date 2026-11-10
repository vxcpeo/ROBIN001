import test from 'node:test';
import assert from 'node:assert/strict';
import { secp256k1 } from '@noble/curves/secp256k1';
import {
  keysFromSignature, generateStealth, checkAnnouncement, parseMetaAddress, parseMetadata, pointToAddress, SIGN_MESSAGE,
} from '../src/lib/stealth.js';

const SIGNATURE = '0x' + '11'.repeat(32) + '22'.repeat(32) + '1b';
const EPH_PRIV = '42'.repeat(32);

test('the signing message is the deployed key message', () => {
  assert.match(SIGN_MESSAGE, /^Receiva · Unlock your private receive keys/);
  assert.match(SIGN_MESSAGE, /Network: Robinhood Chain \(4663\)/);
  assert.match(SIGN_MESSAGE, /Key version: 1$/);
});

test('a signature derives deterministic keys and a valid meta-address', () => {
  const a = keysFromSignature(SIGNATURE);
  const b = keysFromSignature(SIGNATURE);
  assert.equal(a.metaAddress, b.metaAddress);
  assert.match(a.metaAddress, /^st:eth:0x[0-9a-f]{132}$/);
  assert.equal(a.metaBytes.length, 2 + 132);
  const parsed = parseMetaAddress(a.metaAddress);
  assert.equal(parsed.metaBytes, a.metaBytes);
});

test('sender and receiver derive the same one-time key', () => {
  const keys = keysFromSignature(SIGNATURE);
  const st = generateStealth(keys, EPH_PRIV);
  assert.equal(st.ephemeralPubKey.length, 2 + 66);
  assert.ok(st.viewTag >= 0 && st.viewTag <= 255);

  const priv = checkAnnouncement({
    stealthAddress: st.stealthAddress,
    ephemeralPubKey: st.ephemeralPubKey,
    viewTag: st.viewTag,
  }, keys);
  assert.ok(priv);
  assert.equal(pointToAddress(secp256k1.ProjectivePoint.BASE.multiply(BigInt(priv))), st.stealthAddress);
});

test('foreign keys and a wrong view tag do not match', () => {
  const keys = keysFromSignature(SIGNATURE);
  const st = generateStealth(keys, EPH_PRIV);
  const other = keysFromSignature('0x' + '33'.repeat(32) + '44'.repeat(32) + '1c');
  assert.equal(checkAnnouncement({
    stealthAddress: st.stealthAddress,
    ephemeralPubKey: st.ephemeralPubKey,
    viewTag: st.viewTag,
  }, other), null);

  const wrongTag = (st.viewTag + 1) % 256;
  assert.equal(checkAnnouncement({
    stealthAddress: st.stealthAddress,
    ephemeralPubKey: st.ephemeralPubKey,
    viewTag: wrongTag,
  }, keys), null);
});

test('router metadata parses ETH and token announcements', () => {
  const amount = (10n ** 18n).toString(16).padStart(64, '0');
  const ethMeta = '0x' + '7f' + 'eeeeeeee' + 'ee'.repeat(20) + amount;
  const eth = parseMetadata(ethMeta);
  assert.equal(eth.viewTag, 0x7f);
  assert.equal(eth.kind, 'eth');
  assert.equal(eth.amount, 10n ** 18n);

  const token = '0x' + '01' + 'a9059cbb' + '12'.repeat(20) + amount + '05'.repeat(32);
  const parsed = parseMetadata(token);
  assert.equal(parsed.kind, 'token');
  assert.equal(parsed.token, '0x' + '12'.repeat(20));
  assert.equal(parsed.amount, 10n ** 18n);
  assert.equal(parsed.gasTip, BigInt('0x' + '05'.repeat(32)));
});
