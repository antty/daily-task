import test from 'node:test';
import assert from 'node:assert/strict';
import { getManagementPasswordError, validatePasswordChange } from '../src/management-password.js';

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
