const ascending = '012345678901234567890';
const descending = '987654321098765432109';

export function getManagementPasswordError(password) {
  const value = String(password ?? '').trim();
  if (!/^\d{6,12}$/.test(value)) return '管理密码必须是 6–12 位数字。';
  if (value === '123456') return '新密码不能继续使用初始密码 123456。';
  if (new Set(value).size === 1) return '新密码不能使用完全重复的数字。';
  if (ascending.includes(value) || descending.includes(value)) return '新密码不能使用连续递增或递减的数字。';
  return '';
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  if (!String(currentPassword ?? '').trim()) return { ok: false, error: '请输入当前密码。' };
  const error = getManagementPasswordError(newPassword);
  if (error) return { ok: false, error };
  if (newPassword !== confirmPassword) return { ok: false, error: '两次输入的新密码不一致。' };
  return { ok: true, error: '' };
}
