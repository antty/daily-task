import { toDateKey } from './task-domain.js';

const KEY = 'daily-task-family-v1';

const seed = {
  members: [{ id: 'me', name: '我', color: '#6750a4' }, { id: 'partner', name: '家人', color: '#ec6d8c' }],
  types: [{ id: 'home', name: '家务', color: '#3f7cac' }, { id: 'health', name: '健康', color: '#2e8b72' }, { id: 'life', name: '生活', color: '#d68435' }],
  tasks: [
    { id: 'seed-1', title: '准备早餐', description: '简单营养的早餐', typeId: 'home', memberIds: ['me'], startDate: toDateKey(new Date()), recurrence: 'daily', completedDates: [] },
    { id: 'seed-2', title: '晚间散步', description: '一起走 30 分钟', typeId: 'health', memberIds: ['me', 'partner'], startDate: toDateKey(new Date()), recurrence: 'daily', completedDates: [] },
  ],
};

const emptyState = { members: [], types: [], tasks: [] };

const clone = (value) => structuredClone(value);

export function createStore({ seedDemo = false } = {}) {
  let state = load(seedDemo);
  const listeners = new Set();
  const save = () => { localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach((listener) => listener(clone(state))); };
  return {
    getState: () => clone(state),
    replaceState(nextState) { state = clone(nextState); save(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    addTask(task) { state.tasks.unshift({ ...task, id: crypto.randomUUID(), completedDates: [] }); save(); },
    addTaskForMember(task, memberId) { state.tasks.unshift({ ...task, id: crypto.randomUUID(), memberIds: [memberId], completedDates: [] }); save(); },
    updateTask(id, patch) { state.tasks = state.tasks.map((task) => task.id === id ? { ...task, ...patch } : task); save(); },
    deleteTask(id, scope = 'all', fromDate) {
      if (scope === 'future' && fromDate) {
        const end = new Date(`${fromDate}T00:00:00`); end.setDate(end.getDate() - 1);
        state.tasks = state.tasks.map((task) => task.id !== id ? task : { ...task, endDate: toDateKey(end), completedDates: task.completedDates.filter((date) => date < fromDate) });
      } else state.tasks = state.tasks.filter((task) => task.id !== id);
      save();
    },
    completeTask(id, date, detail = {}) {
      state.tasks = state.tasks.map((task) => task.id !== id ? task : { ...task, completedDates: task.completedDates.includes(date) ? task.completedDates : [...task.completedDates, date], completionDetails: { ...(task.completionDetails || {}), [date]: detail } });
      save();
    },
    toggleCompletion(id, date) {
      state.tasks = state.tasks.map((task) => {
        if (task.id !== id) return task;
        const completionDetails = { ...(task.completionDetails || {}) };
        if (task.completedDates.includes(date)) delete completionDetails[date];
        return { ...task, completedDates: task.completedDates.includes(date) ? task.completedDates.filter((value) => value !== date) : [...task.completedDates, date], completionDetails };
      });
      save();
    },
    addMember(name, avatar = '') { state.members.push({ id: crypto.randomUUID(), name, avatar, color: ['#6750a4', '#ec6d8c', '#377d70', '#c2733c'][state.members.length % 4] }); save(); },
    renameMember(id, name) { state.members = state.members.map((member) => member.id === id ? { ...member, name } : member); save(); },
    updateMemberAvatar(id, avatar) { state.members = state.members.map((member) => member.id === id ? { ...member, avatar } : member); save(); },
    deleteMember(id) {
      state.members = state.members.filter((member) => member.id !== id);
      state.tasks = state.tasks.map((task) => ({ ...task, memberIds: task.memberIds.filter((memberId) => memberId !== id) }));
      save();
    },
    addType(name) { state.types.push({ id: crypto.randomUUID(), name, color: ['#3f7cac', '#2e8b72', '#d68435', '#8d5db7'][state.types.length % 4] }); save(); },
    renameType(id, name) { state.types = state.types.map((type) => type.id === id ? { ...type, name } : type); save(); },
    deleteType(id) {
      state.types = state.types.filter((type) => type.id !== id);
      state.tasks = state.tasks.map((task) => task.typeId === id ? { ...task, typeId: '' } : task);
      save();
    },
  };
}

function load(seedDemo) {
  const fallback = seedDemo ? seed : emptyState;
  try { return JSON.parse(localStorage.getItem(KEY)) || clone(fallback); } catch { return clone(fallback); }
}
