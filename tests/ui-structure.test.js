import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

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

test('small screens keep family switching and task management on one row', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(css, /@media\(max-width:600px\)\{\.home-bar \.header-actions\{[^}]*flex-direction:row/);
  assert.match(css, /\.home-bar \.header-actions \.text-button\{[^}]*white-space:nowrap/);
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
