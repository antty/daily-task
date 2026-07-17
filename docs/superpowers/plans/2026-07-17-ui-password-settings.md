# 页面视觉统一与家庭管理密码 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一主要页面与弹窗的视觉细节，将硬编码家庭管理密码替换为 Supabase 中可安全修改并跨设备同步的家庭级密码，同时增加 185 分钟 iPad 额度预设。

**Architecture:** 密码规则放入独立纯函数模块，UI 只负责收集输入和反馈；本地 store 与 Supabase store 暴露相同的异步验证/修改接口。Supabase 使用私有 schema 保存带盐哈希，并通过受限的 public RPC 验证和修改。视觉调整沿用现有 HTML/CSS 架构，集中完善设计变量、弹窗、表单、列表和响应式规则，不重写每日任务或 iPad 领域逻辑。

**Tech Stack:** 原生 HTML/CSS/JavaScript ES Modules、Node.js built-in test runner、Supabase JS v2、PostgreSQL、pgcrypto、GitHub Pages。

## Global Constraints

- 初始家庭管理密码为 `123456`，但新密码不得设置为 `123456`。
- 新密码必须是 6–12 位纯数字，禁止全部相同及完整递增/递减连续数字。
- 密码和哈希不得进入 localStorage、sessionStorage、URL、日志或前端持久化状态。
- 家人管理与 iPad 使用类型管理必须共用家庭级密码。
- 视觉改造不得改变每日任务、任务归属、完成规则、iPad 使用时长和超时算法。
- iPad 默认额度必须是 `60、120、180、185 分钟`，并保留 1–600 分钟自定义额度。
- 所有 CSS 与 JavaScript 资源必须统一更新为缓存版本 `20260717-visual-password`。
- SQL 迁移必须先执行，依赖新 RPC 的前端才能上线。
- 只在 `codex/ui-password-settings` 功能分支开发；合入 main 与发布前必须再次取得用户同意。
- 保留未跟踪文件 `docs/superpowers/plans/2026-07-15-ipad-usage-management.md` 与 `docs/superpowers/specs/2026-07-15-ipad-usage-design.md`，不得纳入提交。

---

## File Map

- Create `src/management-password.js`: 唯一的前端密码格式校验与错误文案来源。
- Create `tests/management-password.test.js`: 密码规则的纯函数测试。
- Create `supabase/management-password-migration.sql`: 现有 Supabase 项目的可重复执行迁移。
- Modify `supabase/schema.sql`: 新项目完整 schema 中加入同样的私有密钥表、初始化触发器与 RPC。
- Modify `src/task-store.js`: 本地回退 store 的同构密码验证/修改接口。
- Modify `src/supabase-store.js`: Supabase RPC 适配器，不向 UI 暴露家庭 ID 或数据库细节。
- Modify `index.html`: 修改密码入口和弹窗、185 分钟预设、统一资源缓存版本。
- Modify `src/app.js`: 异步密码验证、修改密码表单状态、错误映射和成功提示。
- Modify `styles.css`, `extras.css`, `extras-3.css`, `interaction.css`, `ipad.css`, `ipad-layout.css`: 统一视觉变量、控件、弹窗、列表及移动端布局。
- Modify `tests/ui-structure.test.js`: 密码调用、SQL 权限、185 分钟、缓存版本与视觉结构回归测试。
- Modify `README.md`: 新密码机制、修改流程、SQL 执行顺序和默认额度说明。

---

### Task 1: Password policy module

**Files:**
- Create: `src/management-password.js`
- Create: `tests/management-password.test.js`

**Interfaces:**
- Produces: `getManagementPasswordError(password: unknown): string`
- Produces: `validatePasswordChange({ currentPassword, newPassword, confirmPassword }): { ok: boolean, error: string }`
- Consumes: No application state or browser APIs.

- [ ] **Step 1: Write the failing password-policy tests**

```js
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
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `node --test tests/management-password.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/management-password.js`.

- [ ] **Step 3: Implement the pure password rules**

```js
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
```

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/management-password.test.js`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the policy module**

```bash
git add src/management-password.js tests/management-password.test.js
git commit -m "feat: add household password policy"
```

---

### Task 2: Supabase password storage and RPCs

**Files:**
- Create: `supabase/management-password-migration.sql`
- Modify: `supabase/schema.sql`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Produces RPC: `verify_household_management_password(target_household uuid, candidate_password text) returns boolean`
- Produces RPC: `change_household_management_password(target_household uuid, current_password text, new_password text) returns text`
- Produces result codes: `ok`, `invalid_current`, `invalid_new`, `not_authorized`.
- Consumes: Existing `public.can_access_household(uuid)` and `pgcrypto`.

- [ ] **Step 1: Add failing SQL-structure tests**

```js
test('management passwords are private, hashed, and accessed through restricted RPCs', async () => {
  const migration = await readFile(new URL('../supabase/management-password-migration.sql', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  for (const sql of [migration, schema]) {
    assert.match(sql, /create schema if not exists private/);
    assert.match(sql, /private\.household_management_secrets/);
    assert.match(sql, /crypt\('123456',\s*(?:public\.)?gen_salt\('bf'/);
    assert.match(sql, /verify_household_management_password/);
    assert.match(sql, /change_household_management_password/);
    assert.match(sql, /security definer set search_path = ''/);
    assert.match(sql, /revoke execute .* from public, anon/);
    assert.match(sql, /grant execute .* to authenticated/);
  }
});
```

- [ ] **Step 2: Run the focused SQL test and verify failure**

Run: `node --test --test-name-pattern="management passwords are private" tests/ui-structure.test.js`

Expected: FAIL because `supabase/management-password-migration.sql` does not exist.

- [ ] **Step 3: Create the idempotent migration**

Create `supabase/management-password-migration.sql` with these concrete operations:

```sql
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists private.household_management_secrets (
  household_id uuid primary key references public.households(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.household_management_secrets from public, anon, authenticated;

insert into private.household_management_secrets (household_id, password_hash)
select id, public.crypt('123456', public.gen_salt('bf', 8))
from public.households
on conflict (household_id) do nothing;

create or replace function private.initialize_household_management_secret()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.household_management_secrets (household_id, password_hash)
  values (new.id, public.crypt('123456', public.gen_salt('bf', 8)))
  on conflict (household_id) do nothing;
  return new;
end;
$$;

drop trigger if exists initialize_household_management_secret on public.households;
create trigger initialize_household_management_secret
after insert on public.households
for each row execute function private.initialize_household_management_secret();
```

Add both public RPCs with the complete implementation below:

```sql
create or replace function public.verify_household_management_password(
  target_household uuid,
  candidate_password text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare stored_hash text;
begin
  if auth.uid() is null
     or target_household is null
     or nullif(candidate_password, '') is null
     or not public.can_access_household(target_household) then
    return false;
  end if;

  select password_hash into stored_hash
  from private.household_management_secrets
  where household_id = target_household;

  return stored_hash is not null
    and stored_hash = public.crypt(candidate_password, stored_hash);
end;
$$;

create or replace function public.change_household_management_password(
  target_household uuid,
  current_password text,
  new_password text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  stored_hash text;
  normalized_password text := btrim(coalesce(new_password, ''));
begin
  if auth.uid() is null
     or target_household is null
     or not public.can_access_household(target_household) then
    return 'not_authorized';
  end if;

  select password_hash into stored_hash
  from private.household_management_secrets
  where household_id = target_household
  for update;

  if stored_hash is null
     or stored_hash <> public.crypt(coalesce(current_password, ''), stored_hash) then
    return 'invalid_current';
  end if;

  if normalized_password !~ '^[0-9]{6,12}$'
     or normalized_password = '123456'
     or normalized_password = repeat(substr(normalized_password, 1, 1), length(normalized_password))
     or strpos('012345678901234567890', normalized_password) > 0
     or strpos('987654321098765432109', normalized_password) > 0 then
    return 'invalid_new';
  end if;

  update private.household_management_secrets
  set password_hash = public.crypt(normalized_password, public.gen_salt('bf', 8)),
      updated_at = now()
  where household_id = target_household;

  return 'ok';
end;
$$;
```

Finish the migration with exact privilege boundaries:

```sql
revoke execute on function public.verify_household_management_password(uuid, text) from public, anon;
revoke execute on function public.change_household_management_password(uuid, text, text) from public, anon;
grant execute on function public.verify_household_management_password(uuid, text) to authenticated;
grant execute on function public.change_household_management_password(uuid, text, text) to authenticated;
```

- [ ] **Step 4: Mirror the complete SQL in `supabase/schema.sql`**

Insert the private schema/table immediately after `households`, add the backfill and trigger after table creation, and add the two RPC definitions after `can_access_household`. Use the exact table, function signatures, result codes and grants from the migration so new and existing projects behave identically.

- [ ] **Step 5: Run SQL structure tests**

Run: `node --test --test-name-pattern="management passwords are private" tests/ui-structure.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the database contract**

```bash
git add supabase/management-password-migration.sql supabase/schema.sql tests/ui-structure.test.js
git commit -m "feat: secure household management passwords"
```

---

### Task 3: Store adapters for password verification and changes

**Files:**
- Modify: `src/task-store.js`
- Modify: `src/supabase-store.js`
- Modify: `tests/management-password.test.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Produces store method: `verifyManagementPassword(password: string): Promise<boolean>`
- Produces store method: `changeManagementPassword(currentPassword: string, newPassword: string): Promise<'ok'|'invalid_current'|'invalid_new'|'not_authorized'>`
- Consumes RPCs from Task 2 and policy helper from Task 1.

- [ ] **Step 1: Add failing store-contract tests**

Add to `tests/management-password.test.js`:

```js
import { createStore } from '../src/task-store.js';

test('local fallback changes the in-memory management password', async () => {
  const store = createStore();
  assert.equal(await store.verifyManagementPassword('123456'), true);
  assert.equal(await store.changeManagementPassword('000000', '407285'), 'invalid_current');
  assert.equal(await store.changeManagementPassword('123456', '407285'), 'ok');
  assert.equal(await store.verifyManagementPassword('123456'), false);
  assert.equal(await store.verifyManagementPassword('407285'), true);
});
```

Add to `tests/ui-structure.test.js`:

```js
test('the Supabase store delegates password operations to restricted RPCs', async () => {
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(store, /verifyManagementPassword\(password\)/);
  assert.match(store, /rpc\('verify_household_management_password'/);
  assert.match(store, /changeManagementPassword\(currentPassword, newPassword\)/);
  assert.match(store, /rpc\('change_household_management_password'/);
});
```

- [ ] **Step 2: Run the focused tests and verify missing methods**

Run: `node --test --test-name-pattern="local fallback" tests/management-password.test.js && node --test --test-name-pattern="Supabase store delegates" tests/ui-structure.test.js`

Expected: FAIL because both store methods are missing.

- [ ] **Step 3: Implement local store methods**

Inside `createStore`, initialize `let managementPassword = '123456';` outside returned API and add:

```js
async verifyManagementPassword(password) {
  return String(password ?? '') === managementPassword;
},
async changeManagementPassword(currentPassword, newPassword) {
  if (String(currentPassword ?? '') !== managementPassword) return 'invalid_current';
  if (getManagementPasswordError(newPassword)) return 'invalid_new';
  managementPassword = String(newPassword);
  return 'ok';
},
```

Import `getManagementPasswordError` from `./management-password.js`. Do not place `managementPassword` inside the persisted task state.

- [ ] **Step 4: Implement Supabase store RPC adapters**

Add to the API returned by `createSupabaseStore`:

```js
async verifyManagementPassword(password) {
  await ready;
  if (!householdId) return false;
  const { data, error } = await supabase.rpc('verify_household_management_password', {
    target_household: householdId,
    candidate_password: String(password ?? ''),
  });
  if (error) throw error;
  return data === true;
},
async changeManagementPassword(currentPassword, newPassword) {
  await ready;
  if (!householdId) return 'not_authorized';
  const { data, error } = await supabase.rpc('change_household_management_password', {
    target_household: householdId,
    current_password: String(currentPassword ?? ''),
    new_password: String(newPassword ?? ''),
  });
  if (error) throw error;
  return data;
},
```

- [ ] **Step 5: Run focused and full store tests**

Run: `node --test tests/management-password.test.js tests/ui-structure.test.js`

Expected: all tests in both files PASS.

- [ ] **Step 6: Commit the store adapters**

```bash
git add src/task-store.js src/supabase-store.js tests/management-password.test.js tests/ui-structure.test.js
git commit -m "feat: connect management password stores"
```

---

### Task 4: Password dialogs and asynchronous UI flow

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `store.verifyManagementPassword(password)` and `store.changeManagementPassword(currentPassword, newPassword)` from Task 3.
- Consumes: `validatePasswordChange(...)` from Task 1.
- Produces DOM IDs: `open-change-family-password`, `change-password-dialog`, `change-password-form`, `change-password-error`, `change-password-submit`.

- [ ] **Step 1: Replace the hardcoded-password test with failing asynchronous-flow tests**

Replace the existing `/password !== '123456'/` assertion and add:

```js
test('protected management dialogs verify through the shared store API', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /password\s*!==\s*'123456'/);
  assert.match(app, /await store\.verifyManagementPassword\(password\)/);
  assert.match(app, /#family-password-form/);
  assert.match(app, /#ipad-type-password-form/);
});

test('family management exposes a validated password-change flow', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="open-change-family-password"/);
  assert.match(html, /id="change-password-dialog"/);
  assert.match(html, /id="change-password-form"/);
  assert.match(app, /validatePasswordChange/);
  assert.match(app, /await store\.changeManagementPassword/);
});
```

- [ ] **Step 2: Run the focused UI tests and verify failure**

Run: `node --test --test-name-pattern="protected management|password-change flow" tests/ui-structure.test.js`

Expected: FAIL because the HTML controls and async store calls are not present.

- [ ] **Step 3: Add the password-change HTML**

In the family manager header, add a compact secondary action:

```html
<button id="open-change-family-password" class="text-button password-change-entry">修改管理密码</button>
```

Add a sibling dialog after `family-password-dialog`:

```html
<dialog id="change-password-dialog" class="manager-dialog password-dialog change-password-dialog">
  <div class="dialog-head">
    <div><p class="eyebrow">SECURITY</p><h2>修改管理密码</h2></div>
    <button class="text-button dialog-close-icon" data-close-dialog="change-password-dialog" aria-label="关闭"><span aria-hidden="true">×</span></button>
  </div>
  <p>修改后，同一家庭的所有设备都将使用新密码。</p>
  <form id="change-password-form">
    <label>当前密码<input name="currentPassword" type="password" inputmode="numeric" autocomplete="current-password" required></label>
    <label>新密码<input name="newPassword" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" maxlength="12" required></label>
    <label>确认新密码<input name="confirmPassword" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" maxlength="12" required></label>
    <small class="password-hint">使用 6–12 位数字，避免连续、重复数字。</small>
    <p id="change-password-error" class="form-error" role="alert" hidden></p>
    <button id="change-password-submit" class="primary">保存新密码</button>
  </form>
</dialog>
```

- [ ] **Step 4: Implement shared async verification**

Import `validatePasswordChange` in `src/app.js`. Extract an async helper used by both existing password forms:

```js
async function verifyManagementPassword(form, errorElement, buttonLabel, onSuccess) {
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  const password = String(new FormData(form).get('password') || '');
  errorElement.hidden = true;
  submit.disabled = true;
  submit.textContent = '验证中…';
  try {
    if (!await store.verifyManagementPassword(password)) {
      errorElement.textContent = '密码不正确，请重试。';
      errorElement.hidden = false;
      return;
    }
    await onSuccess();
  } catch {
    errorElement.textContent = '暂时无法验证，请稍后重试。';
    errorElement.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = buttonLabel;
  }
}
```

Call the helper from both `family-password-form` and `ipad-type-password-form`; pass `进入家人管理` or `进入使用类型管理` as `buttonLabel` so each form restores its exact original copy.

- [ ] **Step 5: Implement password modification**

Open/reset the dialog from `open-change-family-password`. On submit:

```js
const values = Object.fromEntries(new FormData(event.currentTarget));
const validation = validatePasswordChange(values);
if (!validation.ok) return showPasswordChangeError(validation.error);
const result = await store.changeManagementPassword(values.currentPassword, values.newPassword);
if (result === 'invalid_current') return showPasswordChangeError('当前密码不正确。');
if (result === 'invalid_new') return showPasswordChangeError('新密码不符合安全规则。');
if (result !== 'ok') return showPasswordChangeError('当前设备无权修改这个家庭的密码。');
event.currentTarget.reset();
$('#change-password-dialog').close();
showToast('管理密码已更新，所有家庭设备将同步使用新密码。');
```

Wrap the request in `try/catch/finally`, show `保存中…`, disable duplicate submission, and show `暂时无法保存，请稍后重试。` for network failures.

- [ ] **Step 6: Run focused UI and syntax tests**

Run: `node --test --test-name-pattern="protected management|password-change flow" tests/ui-structure.test.js`

Run: `node --input-type=module --check < src/app.js`

Expected: tests PASS and syntax command exits 0.

- [ ] **Step 7: Commit the password UI flow**

```bash
git add index.html src/app.js tests/ui-structure.test.js
git commit -m "feat: add shared password management flow"
```

---

### Task 5: iPad 185-minute preset and visual polish

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `extras.css`
- Modify: `extras-3.css`
- Modify: `interaction.css`
- Modify: `ipad.css`
- Modify: `ipad-layout.css`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: Existing `[data-ipad-limit]` event delegation and all existing view IDs.
- Produces: `data-ipad-limit="185"` preset with no new domain branch.

- [ ] **Step 1: Add failing preset, cache and visual contract tests**

```js
test('ipad limit presets include 185 minutes', () => {
  assert.match(html, /data-ipad-limit="185">185 分钟/);
});

test('all frontend assets use the same release cache version', () => {
  const versions = [...html.matchAll(/(?:href|src)="[^"]+\?v=([^"]+)"/g)].map((match) => match[1]);
  assert.ok(versions.length >= 7);
  assert.deepEqual([...new Set(versions)], ['20260717-visual-password']);
});

test('shared controls expose comfortable visual and touch sizing', async () => {
  const styles = await Promise.all(['styles.css', 'extras-3.css', 'interaction.css', 'ipad-layout.css'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  const css = styles.join('\n');
  assert.match(css, /--control-height:\s*44px/);
  assert.match(css, /\.manager-dialog/);
  assert.match(css, /\.change-password-dialog/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test --test-name-pattern="185 minutes|release cache|comfortable visual" tests/ui-structure.test.js`

Expected: FAIL because the preset, release version and new shared token are absent.

- [ ] **Step 3: Add the 185-minute preset and update every cache version**

Insert `<button data-ipad-limit="185">185 分钟</button>` after the 180-minute button. Replace all occurrences of `20260716-1035` in `index.html` with `20260717-visual-password`, including all six CSS links and `src/app.js`.

- [ ] **Step 4: Establish consistent visual tokens and controls**

Extend `:root` in `styles.css` with:

```css
--surface:#fff;
--surface-soft:#faf7fd;
--success:#2f7d59;
--danger:#b43f52;
--focus:#bca8e6;
--control-height:44px;
--radius-sm:10px;
--radius-md:16px;
--radius-lg:22px;
--shadow-soft:0 10px 30px #2b16300d;
--shadow-dialog:0 28px 80px #21162f42;
```

Set shared inputs and primary/secondary buttons to `min-height:var(--control-height)`, provide visible `:focus-visible`, disabled opacity/cursor, and keep danger actions visually separate.

- [ ] **Step 5: Polish pages and dialogs without changing DOM behavior**

Remove the first duplicated `.ipad-page-head` / `.ipad-record` rule block from `ipad.css`; retain the later compact record block as the only base definition. Add these shared final rules to the appropriate existing files (`styles.css` for controls, `extras-3.css` for page/dialog surfaces, `interaction.css` for interaction states, and `ipad-layout.css` for iPad surfaces):

```css
/* styles.css */
input,select,textarea,.primary,.secondary{min-height:var(--control-height)}
button,input,select,textarea{transition:border-color .18s ease,box-shadow .18s ease,background .18s ease,transform .18s ease}
button:disabled{opacity:.55;cursor:wait;transform:none!important}
:is(button,input,select,textarea):focus-visible{outline:3px solid var(--focus);outline-offset:2px}

/* extras-3.css */
.home-bar,.panel{background:var(--surface);border-color:var(--line);box-shadow:var(--shadow-soft)}
.manager-dialog{max-height:min(88vh,760px);overflow:auto;border-radius:var(--radius-lg);box-shadow:var(--shadow-dialog)}
.manager-dialog::backdrop{background:#21162f78;backdrop-filter:blur(7px) saturate(.82)}
.dialog-head{align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--line)}
.dialog-close-icon{display:grid!important;place-items:center;width:40px;height:40px;padding:0!important;border:1px solid var(--line)!important;border-radius:12px!important;color:var(--muted)!important;font-size:25px!important;line-height:1!important}
.dialog-close-icon:hover{background:var(--surface-soft)!important;color:var(--ink)!important}
.password-change-entry{font-size:12px;border-radius:9px}
.change-password-dialog form{gap:14px}
.password-hint{color:var(--muted);font-size:12px;line-height:1.5}
.manage-row,.ipad-record{border-radius:var(--radius-sm)}
.manage-row:hover,.ipad-record:hover{background:var(--surface-soft)}

/* interaction.css */
.primary:hover{transform:translateY(-1px);box-shadow:0 8px 18px #6750a438}
.secondary:hover,.text-button:hover{background:#f1ebfa}
.form-error:not([hidden]){padding:9px 11px;border-radius:10px;background:#fff1f3;color:var(--danger)}

/* ipad-layout.css */
.ipad-page-panel,.ipad-calendar-section,.ipad-record-section{min-width:0}
.ipad-calendar-section{border-radius:var(--radius-md);box-shadow:var(--shadow-soft)}
#ipad-summary.overtime{border-color:#e6a1ac;box-shadow:0 10px 24px #b43f5218}

@media(max-width:600px){
  .manager-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px);padding:20px 18px}
  .task-form-actions{flex-wrap:wrap}
  .task-form-actions .primary{min-width:132px}
  .home-bar,.ipad-content-layout{max-width:100%;min-width:0}
}
```

Keep the existing text labels `已完成`, `已超时`, `使用中`, `不计额度`, and their icons so status never relies on color alone.

- [ ] **Step 6: Run visual contract and full automated tests**

Run: `node --test tests/*.test.js`

Expected: all tests PASS, including preset, cache and password tests.

- [ ] **Step 7: Start a local server for manual desktop/mobile review**

Run: `python3 -m http.server 4175`

Open: `http://localhost:4175/?v=20260717-visual-password`

Check: member gate, family password, member manager, password change, task manager, task editor, iPad quota, iPad record list, and iPad type password at desktop and narrow mobile width. Expected: no horizontal overflow; main actions remain visually dominant; close/back controls are reachable and centered.

- [ ] **Step 8: Commit the visual and preset changes**

```bash
git add index.html styles.css extras.css extras-3.css interaction.css ipad.css ipad-layout.css tests/ui-structure.test.js
git commit -m "style: unify task and ipad management surfaces"
```

---

### Task 6: Documentation and release verification

**Files:**
- Modify: `README.md`
- Test: `tests/*.test.js`

**Interfaces:**
- Consumes: Final RPC names, migration filename, password rules and iPad presets from Tasks 1–5.
- Produces: Operator instructions for existing and new Supabase deployments.

- [ ] **Step 1: Update README with exact operational instructions**

Replace references that say the password is permanently `123456` with:

```markdown
- 家庭管理密码初始为 `123456`，可在“家人管理 → 修改管理密码”中修改。
- 密码修改后对同一家庭的所有设备生效；密码只以带盐哈希保存在 Supabase 私有表中。
- 家人管理与 iPad 使用类型管理共用该密码，刷新页面后需要重新验证。
```

Add an upgrade section instructing existing deployments to execute `supabase/management-password-migration.sql` before publishing the new frontend. Update iPad presets to `60 / 120 / 180 / 185 分钟 + 自定义`.

- [ ] **Step 2: Run the complete verification suite**

Run: `node --test tests/*.test.js`

Expected: all tests PASS.

Run: `node --input-type=module --check < src/app.js`

Expected: exits 0 without output.

Run: `git diff --check`

Expected: exits 0 without output.

Run: `git status --short`

Expected: only intended implementation files plus the two preserved pre-existing untracked 2026-07-15 docs appear.

- [ ] **Step 3: Commit documentation**

```bash
git add README.md
git commit -m "docs: document management password migration"
```

- [ ] **Step 4: Stop before merge and deployment**

Report the feature branch name, commits, test count, local review URL, and the exact SQL migration filename. Ask for explicit approval before merging `codex/ui-password-settings` into `main`, pushing main, or publishing GitHub Pages.
