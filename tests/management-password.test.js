import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseInitialFamilyPassword, getManagementPasswordError, validatePasswordChange } from '../src/management-password.js';
import { createStore } from '../src/task-store.js';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});

test('accepts a non-trivial 6 to 12 digit password', () => {
  assert.equal(getManagementPasswordError('407285'), '');
  assert.equal(getManagementPasswordError('4072859361'), '');
});

test('rejects the initial, repeated, sequential, and malformed passwords', () => {
  assert.match(getManagementPasswordError('123456'), /初始密码/);
  assert.match(getManagementPasswordError('777777'), /重复/);
  assert.match(getManagementPasswordError('234567'), /连续/);
  assert.match(getManagementPasswordError('765432'), /连续/);
  assert.match(getManagementPasswordError('12ab56'), /6–12 位数字/);
});

test('validates current password and confirmation before submission', () => {
  assert.deepEqual(validatePasswordChange({ currentPassword: '', newPassword: '407285', confirmPassword: '407285' }), { ok: false, error: '请输入当前密码。' });
  assert.deepEqual(validatePasswordChange({ currentPassword: '123456', newPassword: '407285', confirmPassword: '407286' }), { ok: false, error: '两次输入的新密码不一致。' });
  assert.deepEqual(validatePasswordChange({ currentPassword: '123456', newPassword: '407285', confirmPassword: '407285' }), { ok: true, error: '' });
});

test('local fallback changes the in-memory management password', async () => {
  const store = createStore();
  assert.equal(await store.verifyManagementPassword('123456'), true);
  assert.equal(await store.changeManagementPassword('000000', '407285'), 'invalid_current');
  assert.equal(await store.changeManagementPassword('123456', '407285'), 'ok');
  assert.equal(await store.verifyManagementPassword('123456'), false);
  assert.equal(await store.verifyManagementPassword('407285'), true);
});

test('only a user without a household can enter family setup with the initial password', () => {
  assert.equal(canUseInitialFamilyPassword({ hasHousehold: false, password: '123456' }), true);
  assert.equal(canUseInitialFamilyPassword({ hasHousehold: false, password: '407285' }), false);
  assert.equal(canUseInitialFamilyPassword({ hasHousehold: true, password: '123456' }), false);
});
