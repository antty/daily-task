import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOccurrences, getDaySummary } from '../src/task-domain.js';
import { createStore } from '../src/task-store.js';

const tasks = [
  { id: 'daily', title: '遛狗', memberIds: ['m1'], typeId: 'home', startDate: '2026-07-01', recurrence: 'daily', completedDates: ['2026-07-14'] },
  { id: 'weekly', title: '倒垃圾', memberIds: ['m2'], typeId: 'home', startDate: '2026-07-07', recurrence: 'weekly', completedDates: [] },
  { id: 'once', title: '体检预约', memberIds: ['m1'], typeId: 'health', startDate: '2026-07-15', recurrence: 'none', completedDates: [] },
];

test('buildOccurrences expands daily, weekly and one-off tasks across a date range', () => {
  const occurrences = buildOccurrences(tasks, '2026-07-13', '2026-07-15');
  assert.deepEqual(occurrences.map(({ taskId, date }) => `${taskId}:${date}`), [
    'daily:2026-07-13',
    'daily:2026-07-14',
    'weekly:2026-07-14',
    'daily:2026-07-15',
    'once:2026-07-15',
  ]);
});

test('getDaySummary returns completion progress for calendar cells', () => {
  const summary = getDaySummary(buildOccurrences(tasks, '2026-07-14', '2026-07-14'), '2026-07-14');
  assert.deepEqual(summary, { total: 2, completed: 1, progress: 0.5 });
});

test('member management updates names and removes deleted members from tasks', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.renameMember('me', '小林');
  store.deleteMember('partner');
  const state = store.getState();
  assert.equal(state.members.find((member) => member.id === 'me').name, '小林');
  assert.equal(state.members.some((member) => member.id === 'partner'), false);
  assert.equal(state.tasks.every((task) => !task.memberIds.includes('partner')), true);
});

test('type management updates names and clears deleted task types', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.renameType('home', '家庭事务');
  store.deleteType('health');
  const state = store.getState();
  assert.equal(state.types.find((type) => type.id === 'home').name, '家庭事务');
  assert.equal(state.tasks.find((task) => task.id === 'seed-2').typeId, '');
});

test('deleting future occurrences keeps earlier completions and ends a recurring task', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.deleteTask('seed-1', 'future', '2026-07-15');
  const task = store.getState().tasks.find((item) => item.id === 'seed-1');
  assert.equal(task.endDate, '2026-07-14');
  assert.deepEqual(buildOccurrences([task], '2026-07-14', '2026-07-16').map((item) => item.date), ['2026-07-14']);
});

test('weekly tasks can occur on selected weekdays', () => {
  const weekly = { id: 'weekdays', title: '运动', memberIds: [], typeId: '', startDate: '2026-07-13', recurrence: 'weekly', weekdays: [0, 2, 4], completedDates: [] };
  assert.deepEqual(buildOccurrences([weekly], '2026-07-13', '2026-07-19').map((item) => item.date), ['2026-07-13', '2026-07-15', '2026-07-17']);
});

test('a newly created task keeps only the selected household member', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.addTaskForMember({ title: '个人任务', description: '', typeId: 'home', memberIds: ['partner'], startDate: '2026-07-14', recurrence: 'none', weekdays: [] }, 'me');
  assert.deepEqual(store.getState().tasks[0].memberIds, ['me']);
});

test('editing a task updates its schedule details while retaining completion history', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.toggleCompletion('seed-1', '2026-07-14');
  store.updateTask('seed-1', { title: '准备早午餐', description: '增加水果', typeId: 'life', startDate: '2026-07-16', recurrence: 'weekly', weekdays: [1, 4] });
  const task = store.getState().tasks.find((item) => item.id === 'seed-1');
  assert.equal(task.title, '准备早午餐');
  assert.equal(task.typeId, 'life');
  assert.deepEqual(task.weekdays, [1, 4]);
  assert.deepEqual(task.completedDates, ['2026-07-14']);
});

test('a member can be created with a custom avatar', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.addMember('小满', 'data:image/png;base64,avatar');
  const member = store.getState().members.find((item) => item.name === '小满');
  assert.equal(member.avatar, 'data:image/png;base64,avatar');
});

test('completing a task stores an optional note and image for that day', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  store.completeTask('seed-1', '2026-07-14', { note: '早餐做得很成功', image: 'data:image/png;base64,proof' });
  const task = store.getState().tasks.find((item) => item.id === 'seed-1');
  assert.deepEqual(task.completedDates, ['2026-07-14']);
  assert.deepEqual(task.completionDetails['2026-07-14'], { note: '早餐做得很成功', image: 'data:image/png;base64,proof' });
});

test('store can replace its cached state after cloud hydration', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const store = createStore();
  const remoteState = {
    members: [{ id: 'cloud-member', name: '云端成员', color: '#6750a4', avatar: '' }],
    types: [{ id: 'cloud-type', name: '云端类型', color: '#3f7cac' }],
    tasks: [{ id: 'cloud-task', title: '云端任务', description: '', typeId: 'cloud-type', memberIds: ['cloud-member'], startDate: '2026-07-14', recurrence: 'none', weekdays: [], completedDates: [] }],
  };

  store.replaceState(remoteState);

  assert.deepEqual(store.getState(), remoteState);
});
