import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the browser entry script has valid module syntax', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: app, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('the browser page title presents the habit-building product name', () => {
  assert.match(html, /<title>习惯养成<\/title>/);
});

test('management passwords are private, hashed, and accessed through restricted RPCs', async () => {
  const migration = await readFile(new URL('../supabase/management-password-migration.sql', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  for (const sql of [migration, schema]) {
    assert.match(sql, /create schema if not exists private/);
    assert.match(sql, /create extension if not exists pgcrypto with schema extensions/);
    assert.match(sql, /private\.household_management_secrets/);
    assert.match(sql, /extensions\.crypt\('123456',\s*extensions\.gen_salt\('bf'/);
    assert.doesNotMatch(sql, /public\.(?:crypt|gen_salt)\(/);
    assert.match(sql, /verify_household_management_password/);
    assert.match(sql, /change_household_management_password/);
    assert.match(sql, /security definer set search_path = ''/);
    assert.match(sql, /revoke execute[^;]+from public, anon/);
    assert.match(sql, /grant execute[^;]+to authenticated/);
  }
});

test('the Supabase store delegates password operations to restricted RPCs', async () => {
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(store, /verifyManagementPassword\(password\)/);
  assert.match(store, /rpc\('verify_household_management_password'/);
  assert.match(store, /changeManagementPassword\(currentPassword, newPassword\)/);
  assert.match(store, /rpc\('change_household_management_password'/);
});

test('first-time family setup creates a household before syncing the first member', async () => {
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(store, /async function ensureHousehold\(\)/);
  assert.match(store, /rpc\('create_household_with_invite'/);
  assert.match(store, /verifyManagementPassword\(password\)[\s\S]*if \(!householdId\) return canUseInitialFamilyPassword/);
  assert.match(store, /addMember\(name, avatar\)[\s\S]*await syncFirstFamilySetup\(\)/);
});

test('first-time family setup explains the initial password and keeps invite status current', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(html, /id="member-gate-title"/);
  assert.match(html, /id="member-gate-copy"/);
  assert.match(html, /id="family-password-hint"/);
  assert.match(app, /首次管理密码为 123456，进入后请及时修改。/);
  assert.match(app, /store\.hasHousehold\?\.\(\)/);
  assert.match(app, /store\.getInviteSyncStatus\?\.\(\)/);
  assert.match(store, /let inviteSyncStatus = 'idle'/);
  assert.match(store, /inviteSyncStatus = 'syncing'/);
  assert.match(store, /getInviteSyncStatus: \(\) => inviteSyncStatus/);
});

test('failed first-family sync preserves local members and exposes a retry action', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(html, /id="retry-family-sync"[^>]*hidden/);
  assert.match(app, /已添加的成员会被保留/);
  assert.match(app, /await store\.retryHouseholdSync\(\)/);
  assert.match(store, /async retryHouseholdSync\(\)/);
  assert.match(store, /async function syncLocalMembers\(\)/);
  assert.match(store, /from\('household_members'\)\.upsert/);
});

test('startup resumes family creation when local members exist without a household', async () => {
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const connect = store.match(/async function connect\(\)[\s\S]*?(?=\n  async function ensureHousehold\(\))/)?.[0] || '';
  const refreshIpad = store.match(/async function refreshIpadState\(\)[\s\S]*?(?=\n  async function connect\(\))/)?.[0] || '';
  assert.match(connect, /if \(!householdId\)[\s\S]*local\.getState\(\)\.members\.length[\s\S]*await syncFirstFamilySetup\(\)/);
  assert.match(connect, /await syncFirstFamilySetup\(\)[\s\S]*catch \(error\)[\s\S]*readyError = error/);
  assert.doesNotMatch(refreshIpad, /syncFirstFamilySetup/);
  assert.match(app, /const hasLocalMembers = data\.members\.length > 0/);
  assert.match(app, /恢复家庭同步/);
});

test('entry actions distinguish creating, joining, and leaving a household safely', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/leave-household-migration.sql', import.meta.url), 'utf8');
  assert.match(html, /id="open-family-password" class="primary gate-create-entry">创建家庭/);
  assert.match(html, /id="leave-family-zone"[^>]*hidden/);
  assert.match(html, /id="leave-family-dialog"/);
  assert.match(app, /isFirstFamilySetup \? '创建家庭' : '管理家人'/);
  assert.match(app, /store\.hasJoinedHousehold\?\.\(\)/);
  assert.match(app, /await store\.leaveHousehold\(\)/);
  assert.match(store, /async leaveHousehold\(\)/);
  assert.match(store, /rpc\('leave_household'/);
  assert.match(migration, /function public\.leave_household/);
  assert.match(schema, /function public\.leave_household/);
  assert.match(migration, /delete from public\.household_access/);
  assert.match(migration, /家庭创建者不能退出/);
});

test('leaving a family clears this device even when cloud access revocation fails', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(store, /function clearLocalHousehold\(\)/);
  assert.match(store, /async leaveHousehold\(\)[\s\S]*catch \(error\)[\s\S]*clearLocalHousehold\(\)/);
  assert.match(store, /return \{ left: true, remoteSynced, localOnly:/);
  assert.match(app, /const result = await store\.leaveHousehold\(\)/);
  assert.match(app, /result\.remoteSynced/);
});

test('an exited owner household stays dismissed on this device after refresh', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(store, /const ignoredHouseholdsKey = 'daily-task-ignored-households'/);
  assert.match(store, /function ignoreHousehold\(id\)/);
  assert.match(store, /households\.filter\(\(household\) => !ignoredHouseholds\.has\(household\.id\)\)/);
  assert.match(store, /ignoreHousehold\(targetHousehold\)[\s\S]*clearLocalHousehold\(\)/);
  assert.match(app, /\$\('#leave-family-zone'\)\.hidden = !store\.hasHousehold\?\.\(\)/);
});

test('family sync failures explain the required recovery migration', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const recovery = await readFile(new URL('../supabase/family-sync-recovery-migration.sql', import.meta.url), 'utf8');
  assert.match(store, /getInviteSyncError: \(\) => inviteSyncError/);
  assert.match(app, /family-sync-recovery-migration\.sql/);
  assert.match(schema, /alter extension pgcrypto set schema extensions/);
  assert.match(schema, /extensions\.gen_salt\('bf'\)/);
  assert.match(recovery, /drop trigger if exists initialize_household_management_secret/);
  assert.match(recovery, /create policy "owners create households"/);
  assert.match(recovery, /create or replace function public\.leave_household/);
});

test('family creation uses a restricted server-side RPC', async () => {
  const store = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  const ensureHousehold = store.match(/async function ensureHousehold\(\)[\s\S]*?(?=\n  async function syncLocalMembers\(\))/)?.[0] || '';
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const recovery = await readFile(new URL('../supabase/family-sync-recovery-migration.sql', import.meta.url), 'utf8');
  for (const sql of [schema, recovery]) {
    assert.match(sql, /function public\.create_household_with_invite\(requested_invite_code text\)/);
    assert.match(sql, /current_user_id uuid := auth\.uid\(\)/);
    assert.match(sql, /security definer set search_path = ''/);
    assert.match(sql, /revoke execute on function public\.create_household_with_invite\(text\) from public, anon/);
    assert.match(sql, /grant execute on function public\.create_household_with_invite\(text\) to authenticated/);
  }
  assert.match(ensureHousehold, /rpc\('create_household_with_invite', \{ requested_invite_code: code \}\)/);
  assert.match(ensureHousehold, /rpc\('create_household_with_invite'[\s\S]*?\.single\(\)/);
  assert.doesNotMatch(store, /\.from\(['"]households['"]\)\.(?:insert|upsert|update|delete)\(/);
});

test('family entry waits for household hydration before choosing create or manage', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /store\.ready\.then\(\(\) => \{ render\(\); if \(!ipadPageMemberId\) \$\('#member-gate'\)\.showModal\(\)/);
  assert.doesNotMatch(app, /if \(!ipadPageMemberId\) \$\('#member-gate'\)\.showModal\(\); else \{/);
});

test('family management is only available from the pre-entry dialog behind a password step', () => {
  const home = html.match(/<section id="home-view"[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(home, /open-member-dialog/);
  const gate = html.match(/<dialog id="member-gate"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.match(gate, /id="open-family-password"/);
  assert.match(html, /<dialog id="family-password-dialog"/);
});

test('task management exposes a compact type entry and a centered add-task dialog', () => {
  const management = html.match(/<dialog id="manage-view"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.match(html, /<dialog id="manage-view" class="[^"]*task-manager-dialog/);
  assert.doesNotMatch(management, /id="close-manage"/);
  assert.match(management, /data-close-dialog="manage-view"/);
  assert.doesNotMatch(management, /成员管理/);
  assert.match(management, /id="open-type-dialog"/);
  assert.match(management, />任务类型管理</);
  assert.match(management, /<h2>任务列表<\/h2>/);
  assert.match(management, /class="text-button dialog-close-icon"[^>]*><span aria-hidden="true">×<\/span>/);
  assert.match(html, /<dialog id="task-dialog" class="[^\"]*task-composer-dialog/);
});

test('the current member is displayed as a non-switchable profile chip', () => {
  assert.doesNotMatch(html, /<select id="member-switcher"/);
  assert.match(html, /id="member-name"/);
  assert.match(html, /id="member-avatar"/);
});

test('calendar provides a separate family switcher when more than one member exists', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="open-member-switch"[^>]*aria-label="切换家人"/);
  assert.match(html, /id="open-manage"[^>]*aria-label="管理任务"/);
  assert.match(html, /<dialog id="member-switch-dialog"/);
  assert.match(html, /id="member-switch-list"/);
  assert.match(app, /data-member-switch/);
  assert.match(app, /data\.members\.length > 1/);
});

test('ipad management collects a required type and completion note', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const entryDialog = html.match(/<dialog id="ipad-entry-dialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.match(html, /id="open-ipad-manager"/);
  assert.match(html, /id="ipad-view"/);
  assert.match(html, /id="ipad-limit-options"/);
  assert.match(html, /id="ipad-calendar-grid"/);
  assert.match(entryDialog, /id="ipad-entry-type" name="typeId" required/);
  assert.match(html, /id="ipad-entry-type-error"/);
  assert.doesNotMatch(entryDialog, /name="title"[^>]*required/);
  assert.match(html, /<dialog id="ipad-completion-dialog"/);
  assert.match(html, /name="ipad-completion-note"/);
  assert.match(app, /createIpadDailyLimit/);
  assert.match(app, /请选择使用类型/);
  assert.match(app, /completeIpadUsageEntry\(pendingIpadCompletion, new Date\(\)\.toISOString\(\), note\)/);
  assert.match(app, /getIpadDayStatus/);
});

test('ipad view resets its independent selected date when a member is switched', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /ipadSelectedDate: today/);
  assert.match(app, /function selectIpadMember\(id\)/);
  assert.match(app, /state\.ipadSelectedDate = today/);
});

test('ipad calendar dates select the record date shown in the task pane', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="ipad-record-date"/);
  assert.match(app, /data-ipad-day/);
  assert.match(app, /state\.ipadSelectedDate = day/);
  assert.match(app, /item\.date === ipadSelectedDate/);
  assert.match(app, /#ipad-calendar-grid'\)\.addEventListener\('click'/);
});

test('ipad calendar uses the shared iPhone-style date hierarchy', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(app, /class="ipad-calendar-date"/);
  assert.match(app, /class="ipad-calendar-status \$\{status\}"/);
  assert.match(app, /date === today \? 'today' : ''/);
  assert.match(app, /aria-hidden="true"/);
  assert.match(css, /\.ipad-calendar-grid button\s*\{[^}]*position:\s*relative[^}]*min-height:\s*60px/);
  assert.match(css, /\.ipad-calendar-date\s*\{[^}]*left:\s*50%[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border-radius:\s*50%/);
  assert.match(css, /\.ipad-calendar-grid button\.selected\s*\{[^}]*background:\s*transparent[^}]*box-shadow:\s*none[^}]*transform:\s*none/);
  assert.match(css, /\.ipad-calendar-grid button\.selected \.ipad-calendar-date\s*\{[^}]*background:\s*var\(--color-primary\)[^}]*color:\s*#fff/);
  assert.match(css, /\.ipad-calendar-grid button\.today:not\(\.selected\) \.ipad-calendar-date/);
  assert.match(css, /\.ipad-calendar-status\s*\{[^}]*left:\s*50%[^}]*bottom:\s*4px[^}]*width:\s*14px[^}]*height:\s*14px/);
});

test('ipad usage type management requires the household management password', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /<dialog id="ipad-type-password-dialog"/);
  assert.match(html, /id="ipad-type-password-form"/);
  assert.match(app, /#ipad-type-password-dialog/);
  assert.doesNotMatch(app, /password\s*!==\s*'123456'/);
  assert.match(app, /await store\.verifyManagementPassword\(password\)/);
});

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

test('completed ipad records expose duration and an overtime state', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /getUsageMinutes/);
  assert.match(app, /ipad-duration \$\{isOvertime/);
});

test('ipad daily overtime is rendered as a red summary alert and a strengthened calendar state', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(app, /ipad-summary-overtime/);
  assert.match(app, /summary\.isOvertime \? '已超时' : '剩余'/);
  assert.match(app, /aria-label="\$\{date\} \$\{status === 'overtime'/);
  assert.match(css, /#ipad-summary\.overtime/);
  assert.match(css, /\.ipad-summary-overtime/);
  assert.match(css, /\.ipad-calendar-grid button\.overtime/);
});

test('ipad record content keeps its type and completion note on one compact line', async () => {
  const css = await readFile(new URL('../ipad.css', import.meta.url), 'utf8');
  assert.match(css, /\.ipad-record>div:first-child\{[^}]*white-space:nowrap/);
  assert.match(css, /\.ipad-record>div:first-child p\{display:inline/);
});

test('ipad record timing uses a roomy horizontal information group on desktop', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /\.ipad-record\s*\{[^}]*gap:\s*24px/);
  assert.match(css, /\.ipad-record-time\s*\{[^}]*display:\s*flex[^}]*gap:\s*14px/);
});

test('ipad page uses a wide two-column workspace for records and calendar', async () => {
  const htmlSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(htmlSource, /class="ipad-content-layout"/);
  assert.match(htmlSource, /class="ipad-record-section"/);
  assert.match(htmlSource, /class="ipad-calendar-section"/);
  assert.match(css, /\.ipad-page-panel\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none/);
  assert.match(css, /\.ipad-content-layout\s*\{[^}]*grid-template-columns:/);
});

test('ipad manager opens a fresh versioned standalone page', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /ipadMember=\$\{encodeURIComponent\(state\.memberId\)\}&v=/);
});

test('non-counting ipad usage types have a distinct record marker', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(app, /classList\.add\('excluded'\)/);
  assert.match(app, /不计额度/);
  assert.match(css, /\.ipad-type-tag\.excluded/);
});

test('active ipad records refresh their elapsed seconds without rerendering the page', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-ipad-running-started-at/);
  assert.match(app, /function updateIpadRunningTimers\(\)/);
  assert.match(app, /setInterval\(updateIpadRunningTimers, 1000\)/);
  assert.match(app, /Math\.floor\(seconds \/ 60\)/);
  assert.match(app, /分钟/);
});

test('uploads compress images before converting them to data URLs', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /function compressImageFile\(/);
  assert.match(app, /canvas\.toBlob/);
  assert.match(app, /await compressImageFile\(file\)/);
  assert.doesNotMatch(app, /1\.5MB/);
});

test('mobile ipad management stays in the current page and exposes a return action', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(html, /id="close-ipad-page"/);
  assert.match(app, /matchMedia\('\(max-width: 760px\)'\)/);
  assert.match(app, /history\.back\(\)/);
  assert.match(css, /\.ipad-mobile-back/);
  assert.match(html, /id="close-ipad-page"[^>]*aria-label="返回任务"/);
  assert.match(css, /\.ipad-mobile-back\s*\{[^}]*border-radius:\s*50%/);
});

test('static assets use a release version to prevent stale mobile styles', () => {
  assert.match(html, /href="styles\.css\?v=/);
  assert.match(html, /href="ipad-layout\.css\?v=/);
  assert.match(html, /src="src\/app\.js\?v=/);
});

test('the browser entry script uses the current release version after a production fix', () => {
  assert.match(html, /src="src\/app\.js\?v=20260720-family-rpc"/);
});

test('the browser entry module loads the Supabase store at the current release version', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /from '\.\/supabase-store\.js\?v=20260720-family-rpc'/);
});

test('ipad limit presets include 185 minutes', () => {
  assert.match(html, /data-ipad-limit="185">185 分钟/);
});

test('all frontend assets use the same release cache version', () => {
  const versions = [...html.matchAll(/(?:href|src)="[^"]+\?v=([^"]+)"/g)].map((match) => match[1]);
  assert.ok(versions.length >= 7);
  assert.deepEqual([...new Set(versions)], ['20260720-family-rpc']);
});

test('shared controls expose comfortable visual and touch sizing', async () => {
  const styles = await Promise.all(['styles.css', 'extras-3.css', 'interaction.css', 'ipad-layout.css'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  const css = styles.join('\n');
  assert.match(css, /--control-height:\s*44px/);
  assert.match(css, /\.manager-dialog/);
  assert.match(css, /\.change-password-dialog/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
});

test('the ipad summary stays visually hidden before a quota exists', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /#ipad-summary\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
});

test('decorative English eyebrow copy is removed from the Chinese interface', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /class="eyebrow"[^>]*>\s*[A-Z][A-Z ]+\s*</);
  assert.doesNotMatch(html, />\s*(?:WELCOME|SCREEN TIME|USAGE RECORDS|SECURITY|FAMILY|JOIN FAMILY|USAGE FINISHED|USAGE TYPE|AVATAR|NEW TASK|NICE WORK)\s*</);
  assert.doesNotMatch(app, /'(?:EDIT TASK|NEW TASK|TASK DETAIL|COMPLETED)'/);
  assert.match(app, /completed \? '已完成' : '任务详情'/);
});

test('README documents password migration and the 185-minute preset', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /management-password-migration\.sql/);
  assert.match(readme, /60、120、180、185 分钟/);
  assert.match(readme, /先执行.*management-password-migration\.sql.*再发布前端/s);
  assert.match(readme, /6–12 位数字/);
});

test('mobile ipad view hides home navigation and centers its own heading', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /body:has\(#ipad-view:not\(\[hidden\]\)\) \.home-bar/);
  assert.match(css, /\.ipad-page-head > div\s*\{[^}]*text-align:\s*center/);
  assert.match(css, /grid-template-columns:\s*32px 1fr 32px/);
});

test('active ipad timer occupies its own prominent wrapped row', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /\.ipad-record-time\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.ipad-running-duration\s*\{[^}]*flex-basis:\s*100%/);
  assert.match(css, /\.ipad-running-duration\s*\{[^}]*background:/);
});

test('overtime duration is rendered as a prominent warning badge', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /\.ipad-duration\.overtime\s*\{[^}]*background:/);
  assert.match(css, /\.ipad-duration\.overtime\s*\{[^}]*border:/);
});

test('running ipad timer escalates from yellow at 45 minutes to red at one hour', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(app, /seconds >= 3600/);
  assert.match(app, /seconds >= 2700/);
  assert.match(app, /classList\.add\('danger'\)/);
  assert.match(app, /classList\.add\('warning'\)/);
  assert.match(css, /\.ipad-running-duration\.warning/);
  assert.match(css, /\.ipad-running-duration\.danger/);
});

test('completed ipad time fields use spaced punctuation separators', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /\.ipad-record-time > span \+ span::before/);
  assert.match(css, /content:\s*'·'/);
  assert.match(css, /\.ipad-record-time \.ipad-duration::before/);
});

test('small screens keep family switching and task management on one row', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(css, /@media\(max-width:600px\)\{\.home-bar \.header-actions\{[^}]*flex-direction:row/);
  assert.match(css, /\.home-bar \.header-actions \.text-button\{[^}]*white-space:nowrap/);
});

test('touching buttons does not leave a browser-default selected outline', async () => {
  const css = await readFile(new URL('../interaction.css', import.meta.url), 'utf8');
  assert.match(css, /-webkit-tap-highlight-color:transparent/);
  assert.match(css, /button:focus:not\(:focus-visible\)\{outline:0/);
});

test('member creation supports a custom avatar upload', () => {
  assert.match(html, /name="avatar" type="file" accept="image\/\*"/);
  assert.match(html, /id="member-avatar-add-preview"/);
});

test('task completion has a dedicated note and image dialog', () => {
  assert.match(html, /<dialog id="completion-dialog"/);
  assert.match(html, /name="completion-image" type="file" accept="image\/\*"/);
  assert.doesNotMatch(html, />日常<\/h1>/);
  assert.match(html, /添加第一位成员后，即可开始管理任务/);
});

test('task content opens detail while only the checkbox controls completion', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /class="task-copy" data-complete=/);
  assert.match(app, /class="task-copy" data-task-detail=/);
  assert.match(html, /<dialog id="task-detail-dialog"/);
  assert.match(html, /<dialog id="undo-completion-dialog"/);
});

test('motivation is a text-only message rotating every sixteen seconds', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /setInterval\(rotateMotivation, 16000\)/);
});

test('calendar renders distinct complete and pending day states', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /calendar-status complete/);
  assert.match(app, /calendar-status pending/);
  assert.match(app, /calendar-status has-task/);
  assert.match(app, /date === today && summary\.completed !== summary\.total/);
});

test('member management provides an avatar editing entry', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-edit-avatar/);
  assert.match(html, /id="member-avatar-form"/);
  assert.match(html, /name="member-avatar" type="file" accept="image\/\*"/);
});

test('family invite flow exposes an invite code and joining entry', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const remoteStore = await readFile(new URL('../src/supabase-store.js', import.meta.url), 'utf8');
  assert.match(html, /id="open-join-family"/);
  assert.match(html, /id="open-join-family" class="text-button gate-join-entry" aria-pressed="false"/);
  assert.match(html, /id="join-family-form"/);
  assert.match(html, /id="family-invite-code"/);
  assert.match(app, /joinHousehold/);
  assert.match(app, /hasJoinedHousehold/);
  assert.match(app, /store\.hasJoinedHousehold\?\.\(\) \|\| data\.members\.length/);
  assert.match(app, /需要执行迁移/);
  assert.match(remoteStore, /else \{ householdId = ''; inviteCode = ''; inviteSyncStatus = 'idle'; \}/);
});

test('future task dates stay unmarked and completion uploads have a preview', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /date > today/);
  assert.match(html, /id="completion-image-preview"/);
});

test('lavender design tokens and accessible motion rules are present', async () => {
  const base = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const interaction = await readFile(new URL('../interaction.css', import.meta.url), 'utf8');
  assert.match(base, /--color-primary:\s*#6d55a6/i);
  assert.match(base, /--color-background:\s*#f7f4fb/i);
  assert.match(base, /--control-height:\s*44px/i);
  assert.match(interaction, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(interaction, /:focus-visible/);
});

test('home navigation uses accessible svg icons and responsive hierarchy', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(html, /id="open-ipad-manager"[\s\S]*?<svg[^>]*aria-hidden="true"/);
  assert.match(html, /id="open-manage"[\s\S]*?<svg[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /<span aria-hidden="true">(?:◷|⇄|☷)<\/span>/);
  assert.match(css, /\.home-bar\s*\{[^}]*grid-template-columns:/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.home-layout\s*\{[^}]*grid-template-columns:\s*1fr/);
});

test('dialogs share labeled fields, accessible close controls, and mobile sheets', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /class="[^"]*dialog-body/);
  assert.match(html, /class="[^"]*dialog-footer/);
  assert.match(html, /data-password-toggle/);
  assert.match(app, /\[data-password-toggle\]/);
  assert.match(css, /\.manager-dialog::backdrop\s*\{[^}]*rgba\(35,\s*28,\s*42,\s*\.52\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.manager-dialog\s*\{[^}]*margin:\s*auto 12px 12px/);
});

test('ipad page exposes metric cards and a complete mobile calendar', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(app, /ipad-metric/);
  assert.match(app, /今日记录/);
  assert.match(css, /\.ipad-content-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.25fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.ipad-page-panel \.ipad-calendar-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7,\s*1fr\)/);
});

test('lavender refresh uses one cache version across every frontend asset', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const versions = [...html.matchAll(/(?:href|src)="[^"]+\?v=([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(versions).size, 1);
  assert.equal(versions[0], '20260720-family-rpc');
});

test('member dialogs retain compact scoped spacing in short and narrow viewports', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(css, /\.manager-dialog:focus-visible\s*\{[^}]*outline:\s*none/);
  assert.match(css, /\.gate-dialog\s*\{[^}]*width:\s*min\(460px,\s*calc\(100vw - 24px\)\)[^}]*padding:\s*22px 24px 24px/);
  assert.match(css, /\.member-switch-dialog\s*\{[^}]*width:\s*min\(480px,\s*calc\(100vw - 24px\)\)/);
  assert.match(css, /\.member-switch-dialog > p\s*\{[^}]*padding:\s*16px 24px 0/);
  assert.match(css, /\.member-switch-dialog > \.member-switch-list\s*\{[^}]*padding:\s*12px 24px 24px/);
  assert.match(css, /@media\s*\(max-height:\s*560px\)[\s\S]*\.gate-dialog,[\s\S]*\.member-switch-dialog\s*\{[^}]*margin:\s*auto/);
});

test('every dialog variant keeps an intentional width and content rhythm', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(css, /\.manager-dialog\s*\{[^}]*width:\s*min\(var\(--dialog-width,\s*600px\),\s*calc\(100vw - 24px\)\)/);
  assert.match(css, /\.task-manager-dialog\s*\{[^}]*--dialog-width:\s*980px/);
  assert.match(css, /\.task-composer-dialog\s*\{[^}]*--dialog-width:\s*680px/);
  assert.match(css, /\.task-detail-dialog\s*\{[^}]*--dialog-width:\s*520px/);
  assert.match(css, /\.task-detail-dialog > \.detail-meta\s*\{[^}]*padding:\s*16px 24px 0/);
  assert.match(css, /\.task-detail-dialog > \.detail-description\s*\{[^}]*margin:\s*12px 24px 0[^}]*padding:\s*14px 16px/);
  assert.match(css, /\.manager-dialog\.task-detail-dialog > \.detail-completion\s*\{[^}]*margin:\s*12px 24px 24px[^}]*padding:\s*16px/);
  assert.match(css, /\.undo-dialog,[\s\S]*\.delete-dialog\s*\{[^}]*padding:\s*24px/);
  assert.match(css, /\.join-family-dialog > p\s*\{[^}]*padding:\s*16px 24px 0/);
  assert.match(css, /\.dialog-head > \[data-close-dialog\]\s*\{[^}]*min-height:\s*44px/);
});

test('selected task calendar date stays visible over completion state backgrounds', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(css, /\.compact-home \.day\s*\{[^}]*height:\s*60px/);
  assert.match(css, /\.compact-home \.day b\s*\{[^}]*position:\s*absolute[^}]*left:\s*50%[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border-radius:\s*50%[^}]*transform:\s*translateX\(-50%\)/);
  assert.match(css, /\.compact-home \.day\.selected\s*\{[^}]*background:\s*transparent[^}]*box-shadow:\s*none/);
  assert.match(css, /\.compact-home \.day\.selected b\s*\{[^}]*background:\s*var\(--color-primary\)[^}]*color:\s*#fff/);
  assert.match(css, /\.compact-home \.day\.today:not\(\.selected\) b\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--color-primary\)/);
  assert.match(css, /\.compact-home \.day \.calendar-status\s*\{[^}]*left:\s*50%[^}]*bottom:\s*4px[^}]*width:\s*14px[^}]*height:\s*14px[^}]*transform:\s*translateX\(-50%\)/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.compact-home \.day b\s*\{[^}]*width:\s*30px[^}]*height:\s*30px/);
});

test('ipad overtime metric keeps the same card geometry as sibling metrics', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(css, /\.ipad-metric\.ipad-summary-overtime\s*\{[^}]*margin-left:\s*0[^}]*border-radius:\s*15px/);
  assert.doesNotMatch(css, /\.ipad-metric\.ipad-summary-overtime\s*\{[^}]*border-radius:\s*999px/);
});

test('product introduction page exposes the public landing structure', async () => {
  const intro = await readFile(new URL('../intro.html', import.meta.url), 'utf8');
  assert.match(intro, /<title>习惯养成 · 家庭任务与 iPad 使用管理<\/title>/);
  assert.match(intro, /id="intro-hero"/);
  assert.match(intro, /id="features"/);
  assert.match(intro, /id="screenshots"/);
  assert.match(intro, /id="workflow"/);
  assert.match(intro, /href="index\.html"[^>]*>\s*立即开始/);
});

test('product introduction page uses local accessible screenshots', async () => {
  const intro = await readFile(new URL('../intro.html', import.meta.url), 'utf8');
  assert.match(intro, /href="intro\.css\?v=20260721-intro-video"/);
  for (const name of ['daily-calendar', 'task-completion', 'ipad-usage']) {
    assert.match(intro, new RegExp(`src="assets/intro/${name}\\.webp"[^>]+alt="[^"]+"[^>]+width="\\d+"[^>]+height="\\d+"`));
  }
});

test('intro product video teaches the desktop web workflow without autoplay', async () => {
  const intro = await readFile(new URL('../intro.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../intro.css', import.meta.url), 'utf8');
  assert.match(intro, /id="product-video"/);
  assert.match(intro, /src="assets\/intro\/video\/product-tour\.mp4"/);
  assert.match(intro, /poster="assets\/intro\/video\/product-tour-poster\.webp"/);
  assert.match(intro, /src="assets\/intro\/video\/product-tour-zh\.vtt"/);
  assert.match(intro, /<video[^>]*controls[^>]*playsinline[^>]*preload="metadata"/);
  assert.doesNotMatch(intro, /<video[^>]*autoplay/);
  assert.match(intro, /href="index\.html"[^>]*>立即开始使用<\/a>/);
  assert.match(css, /\.intro-video-frame\s*\{[^}]*width:\s*min\(100%,\s*1040px\)/);
  assert.match(css, /\.intro-video-frame video\s*\{[^}]*width:\s*100%[^}]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.intro-video-actions\s*\{[^}]*flex-direction:\s*column/);
});

test('product introduction hero keeps its headline and screenshot inside the layout', async () => {
  const intro = await readFile(new URL('../intro.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../intro.css', import.meta.url), 'utf8');
  assert.match(intro, /<span class="intro-title-line">在家里自然发生<\/span>/);
  assert.match(css, /\.intro-title-line\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.intro-hero-visual\s*\{[^}]*width:\s*100%[^}]*max-width:\s*720px/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*\.intro-hero-grid,[\s\S]*\.intro-workflow-layout\s*\{[^}]*grid-template-columns:\s*1fr/);
});
