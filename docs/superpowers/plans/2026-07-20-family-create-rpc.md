# 家庭创建安全函数实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 通过受限的 Supabase 服务端函数创建家庭，解决客户端直插 `households` 持续触发 RLS 拒绝的问题。

**架构：** 数据库新增 `create_household_with_invite(text)` 安全定义者函数，由服务端读取 `auth.uid()` 并固定写入 `owner_id`。前端只传入随机邀请码并调用 RPC，成功后继续复用现有成员同步流程；RLS、密码初始化触发器和现有业务表均保持不变。

**技术栈：** 原生 ES Modules、Supabase JavaScript v2、PostgreSQL/PLpgSQL、Node.js Test Runner、GitHub Pages。

## 全局约束

- 保留 `households` 的 RLS，不开放 `anon` 直接写入。
- RPC 只授权给 `authenticated`，并使用 `security definer set search_path = ''`。
- 不删除现有家庭、成员、任务、完成记录或 iPad 使用记录。
- 数据库迁移可以重复执行。
- 每次线上修复都更新所有前端资源的统一缓存版本号。

---

### Task 1：新增受限的家庭创建 RPC

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/family-sync-recovery-migration.sql`
- Test: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: Supabase `auth.uid()`、`public.households(id, owner_id, invite_code)`。
- Produces: `public.create_household_with_invite(requested_invite_code text) returns table(id uuid, invite_code text)`。

- [ ] **Step 1：先写失败测试**

在 `tests/ui-structure.test.js` 的家庭同步测试附近加入：

```js
test('family creation uses a restricted server-side RPC', async () => {
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const recovery = await readFile(new URL('../supabase/family-sync-recovery-migration.sql', import.meta.url), 'utf8');
  for (const sql of [schema, recovery]) {
    assert.match(sql, /function public\.create_household_with_invite\(requested_invite_code text\)/);
    assert.match(sql, /current_user_id uuid := auth\.uid\(\)/);
    assert.match(sql, /security definer set search_path = ''/);
    assert.match(sql, /revoke execute on function public\.create_household_with_invite\(text\) from public, anon/);
    assert.match(sql, /grant execute on function public\.create_household_with_invite\(text\) to authenticated/);
  }
  assert.match(store, /rpc\('create_household_with_invite'/);
  assert.doesNotMatch(store, /from\('households'\)\.insert/);
});
```

- [ ] **Step 2：运行测试并确认失败**

Run:

```bash
node --test --test-name-pattern='family creation uses a restricted server-side RPC' tests/ui-structure.test.js
```

Expected: FAIL，提示 schema 中不存在 `create_household_with_invite`。

- [ ] **Step 3：在两个 SQL 文件加入同一份可重复执行函数**

在 `supabase/schema.sql` 与 `supabase/family-sync-recovery-migration.sql` 中加入：

```sql
create or replace function public.create_household_with_invite(
  requested_invite_code text
)
returns table(id uuid, invite_code text)
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(btrim(coalesce(requested_invite_code, '')));
begin
  if current_user_id is null then
    raise exception '需要登录后创建家庭' using errcode = '42501';
  end if;

  if normalized_code !~ '^[A-HJ-NP-Z2-9]{8}$' then
    raise exception '邀请码格式无效' using errcode = '22023';
  end if;

  return query
  insert into public.households as created (id, owner_id, invite_code)
  values (gen_random_uuid(), current_user_id, normalized_code)
  returning created.id, created.invite_code;
end;
$$;

revoke execute on function public.create_household_with_invite(text) from public, anon;
grant execute on function public.create_household_with_invite(text) to authenticated;
```

- [ ] **Step 4：运行 SQL 结构测试**

Run:

```bash
node --test --test-name-pattern='family creation uses a restricted server-side RPC' tests/ui-structure.test.js
```

Expected: 仍因前端尚未调用 RPC 而 FAIL，但 SQL 相关断言通过。

---

### Task 2：前端改用 RPC 并更新缓存版本

**Files:**
- Modify: `src/supabase-store.js`
- Modify: `index.html`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `create_household_with_invite(requested_invite_code text)`。
- Produces: `ensureHousehold(): Promise<string>`，返回新家庭 UUID，并更新现有 `householdId`、`inviteCode` 和同步状态。

- [ ] **Step 1：替换客户端直插逻辑**

把 `ensureHousehold()` 中创建家庭的请求替换为：

```js
const { data, error } = await supabase
  .rpc('create_household_with_invite', { requested_invite_code: code })
  .single();
if (error) throw error;
```

保留后续：

```js
householdId = data.id;
inviteCode = data.invite_code;
inviteSyncStatus = 'ready';
inviteSyncError = '';
```

- [ ] **Step 2：运行 RPC 测试并确认通过**

Run:

```bash
node --test --test-name-pattern='family creation uses a restricted server-side RPC' tests/ui-structure.test.js
```

Expected: PASS。

- [ ] **Step 3：先把缓存版本测试改为新版本并确认失败**

把缓存断言统一改为：

```js
'20260720-family-rpc'
```

Run:

```bash
node --test --test-name-pattern='current release version|all frontend assets|lavender refresh' tests/ui-structure.test.js
```

Expected: FAIL，实际版本仍为 `20260720-family-resume2`。

- [ ] **Step 4：更新 `index.html` 全部七个资源版本**

将所有资源查询参数统一改为：

```html
?v=20260720-family-rpc
```

- [ ] **Step 5：运行前端测试**

Run:

```bash
node --check src/app.js
node --test --test-reporter=dot
git diff --check
```

Expected: JavaScript 语法检查通过，全部测试 0 失败，diff 无空白错误。

---

### Task 3：执行数据库迁移、上线并复测

**Files:**
- Execute: `supabase/family-sync-recovery-migration.sql` in Supabase project `xrmxvqugojfaunoeenlv`
- Verify: `https://antty.github.io/daily-task/`

**Interfaces:**
- Consumes: Task 1 的 SQL 函数、Task 2 的前端 RPC 调用。
- Produces: 可在现有本地成员数据上恢复创建的云端家庭与邀请码。

- [ ] **Step 1：在 Chrome Supabase SQL Editor 执行最新恢复迁移**

选择整个 `supabase/family-sync-recovery-migration.sql` 内容并执行。Supabase 若显示安全检查，确认目标项目为 `xrmxvqugojfaunoeenlv` 后选择继续执行但不自动为 `private` 表创建客户端 RLS；该表已撤销 `public`、`anon`、`authenticated` 权限，只供安全函数访问。

Expected: `Success. No rows returned`。

- [ ] **Step 2：只读验证函数权限**

执行：

```sql
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'create_household_with_invite';
```

Expected: 一行，`security_type = DEFINER`。

- [ ] **Step 3：提交并推送主分支**

```bash
git add src/supabase-store.js index.html supabase/schema.sql supabase/family-sync-recovery-migration.sql tests/ui-structure.test.js
git commit -m "fix: create families through secure rpc"
git push origin main
```

- [ ] **Step 4：确认 GitHub Pages 构建**

```bash
gh api 'repos/antty/daily-task/actions/runs?per_page=1' --jq '.workflow_runs[0] | {status, conclusion, head_sha, html_url}'
```

Expected: `status = completed`、`conclusion = success`、`head_sha` 等于本次提交。

- [ ] **Step 5：Chrome/Safari 线上验证**

打开：

```text
https://antty.github.io/daily-task/?v=20260720-family-rpc
```

在保留本地成员的设备刷新；应用自动调用恢复创建流程。若仍显示同步失败，点击一次“重新同步”。

Expected:

- 首页不再显示“创建家庭＋已有成员”的矛盾状态。
- 家庭邀请码显示为 8 位字符。
- 刷新页面后家庭和成员仍存在。
- 任务与 iPad 管理入口功能不受影响。
