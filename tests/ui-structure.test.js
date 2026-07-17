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
    assert.match(sql, /private\.household_management_secrets/);
    assert.match(sql, /crypt\('123456',\s*(?:public\.)?gen_salt\('bf'/);
    assert.match(sql, /verify_household_management_password/);
    assert.match(sql, /change_household_management_password/);
    assert.match(sql, /security definer set search_path = ''/);
    assert.match(sql, /revoke execute[^;]+from public, anon/);
    assert.match(sql, /grant execute[^;]+to authenticated/);
  }
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

test('ipad usage type management requires the household management password', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /<dialog id="ipad-type-password-dialog"/);
  assert.match(html, /id="ipad-type-password-form"/);
  assert.match(app, /#ipad-type-password-dialog/);
  assert.match(app, /password !== '123456'/);
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
  assert.match(app, /已超时 <strong>/);
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
  assert.match(html, /src="src\/app\.js\?v=20260716-1035"/);
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
  assert.match(html, /选择家庭成员后进入任务系统/);
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
  assert.match(html, /id="open-join-family" class="text-button" aria-pressed="false"/);
  assert.match(html, /id="join-family-form"/);
  assert.match(html, /id="family-invite-code"/);
  assert.match(app, /joinHousehold/);
  assert.match(app, /hasJoinedHousehold/);
  assert.match(app, /store\.hasJoinedHousehold\?\.\(\) \|\| data\.members\.length/);
  assert.match(app, /需要执行迁移/);
  assert.match(remoteStore, /else \{ householdId = ''; inviteCode = ''; \}/);
});

test('future task dates stay unmarked and completion uploads have a preview', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /date > today/);
  assert.match(html, /id="completion-image-preview"/);
});
