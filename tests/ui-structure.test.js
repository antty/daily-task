import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('family management is only available from the pre-entry dialog behind a password step', () => {
  const home = html.match(/<section id="home-view"[\s\S]*?<\/section>\s*<section id="manage-view"/)?.[0] || '';
  assert.doesNotMatch(home, /open-member-dialog/);
  const gate = html.match(/<dialog id="member-gate"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.match(gate, /id="open-family-password"/);
  assert.match(html, /<dialog id="family-password-dialog"/);
});

test('task management exposes a compact type entry and a centered add-task dialog', () => {
  const management = html.match(/<section id="manage-view"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || '';
  assert.doesNotMatch(management, /成员管理/);
  assert.match(management, /id="open-type-dialog"/);
  assert.match(management, />任务类型管理</);
  assert.match(html, /<dialog id="task-dialog" class="[^\"]*task-composer-dialog/);
});

test('the current member is displayed as a non-switchable profile chip', () => {
  assert.doesNotMatch(html, /<select id="member-switcher"/);
  assert.match(html, /id="member-name"/);
  assert.match(html, /id="member-avatar"/);
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
  assert.match(app, /date >= today/);
});

test('member management provides an avatar editing entry', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-edit-avatar/);
  assert.match(html, /id="member-avatar-form"/);
  assert.match(html, /name="member-avatar" type="file" accept="image\/\*"/);
});

test('future task dates stay unmarked and completion uploads have a preview', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /date >= today/);
  assert.match(html, /id="completion-image-preview"/);
});
