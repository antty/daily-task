import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createStore } from './task-store.js';
import { supabaseConfig } from './supabase-config.js';
import { canUseInitialFamilyPassword } from './management-password.js';

const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
const colors = ['#6750a4', '#ec6d8c', '#377d70', '#c2733c', '#3f7cac', '#2e8b72'];
const write = async (request) => { const { error } = await request; if (error) throw error; };
const householdKey = 'daily-task-active-household';
const joinedHouseholdKey = 'daily-task-joined-household';
const createInviteCode = () => Array.from(crypto.getRandomValues(new Uint32Array(8)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32]).join('');

const asDataUrlFile = async (value, name, householdId) => {
  if (!value?.startsWith?.('data:')) return value || '';
  const blob = await (await fetch(value)).blob();
  const path = `${householdId}/${crypto.randomUUID()}-${name}`;
  const { error } = await supabase.storage.from('task-media').upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from('task-media').getPublicUrl(path).data.publicUrl;
};

export function createSupabaseStore() {
  const local = createStore();
  let householdId;
  let inviteCode = '';
  let inviteSyncStatus = 'idle';
  let userId;
  let readyError;
  let householdCreation;
  let ipadState = { types: [], limits: [], entries: [] };
  const ready = connect();
  const sync = (work) => ready.then(work).catch((error) => { readyError = error; console.error('Supabase sync failed', error); });

  async function refreshIpadState() {
    if (!householdId) return;
    const [{ data: types, error: typeError }, { data: limits, error: limitError }, { data: entries, error: entryError }] = await Promise.all([
      supabase.from('ipad_usage_types').select('*').eq('household_id', householdId),
      supabase.from('ipad_daily_limits').select('*').eq('household_id', householdId),
      supabase.from('ipad_usage_entries').select('*').eq('household_id', householdId),
    ]);
    if (typeError || limitError || entryError) throw typeError || limitError || entryError;
    ipadState = {
      types: types.map((item) => ({ id: item.id, memberId: item.member_id, name: item.name, color: item.color, countsTowardLimit: item.counts_toward_limit })),
      limits: limits.map((item) => ({ id: item.id, memberId: item.member_id, date: item.usage_date, limitMinutes: item.limit_minutes })),
      entries: entries.map((item) => ({ id: item.id, memberId: item.member_id, dailyLimitId: item.daily_limit_id, typeId: item.type_id, title: item.title || '', note: item.note || '', startedAt: item.started_at, endedAt: item.ended_at })),
    };
    local.replaceState(local.getState());
  }

  async function connect() {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    if (!session) throw new Error('无法建立 Supabase 匿名会话。请在 Authentication 中启用 Anonymous Sign-Ins。');
    userId = session.user.id;
    const preferredId = localStorage.getItem(householdKey);
    const { data: preferred } = preferredId ? await supabase.from('households').select('id, invite_code').eq('id', preferredId).maybeSingle() : { data: null };
    const { data: households, error: householdError } = await supabase.from('households').select('id, invite_code').eq('owner_id', userId).limit(1);
    if (householdError) throw householdError;
    if (preferred && !households.some((household) => household.id === preferred.id)) localStorage.setItem(joinedHouseholdKey, preferred.id);
    if (preferred) { householdId = preferred.id; inviteCode = preferred.invite_code; inviteSyncStatus = 'ready'; }
    else if (households.length) { householdId = households[0].id; inviteCode = households[0].invite_code; inviteSyncStatus = 'ready'; }
    else { householdId = ''; inviteCode = ''; inviteSyncStatus = 'idle'; }
    if (!householdId) return;
    localStorage.setItem(householdKey, householdId);
    const remote = await loadRemote();
    if (remote.members.length || remote.tasks.length || remote.types.length) local.replaceState(remote);
    else await seedRemote(local.getState());
    await refreshIpadState();
  }

  async function ensureHousehold() {
    if (householdId) return householdId;
    if (householdCreation) return householdCreation;
    inviteSyncStatus = 'syncing';
    local.replaceState(local.getState());
    householdCreation = (async () => {
      const id = crypto.randomUUID();
      const code = createInviteCode();
      const { data, error } = await supabase.from('households').insert({ id, owner_id: userId, invite_code: code }).select('id, invite_code').single();
      if (error) throw error;
      householdId = data.id;
      inviteCode = data.invite_code;
      inviteSyncStatus = 'ready';
      localStorage.setItem(householdKey, householdId);
      local.replaceState(local.getState());
      return householdId;
    })();
    try {
      return await householdCreation;
    } catch (error) {
      inviteSyncStatus = 'failed';
      local.replaceState(local.getState());
      throw error;
    } finally {
      householdCreation = undefined;
    }
  }

  async function loadRemote() {
    const [{ data: members, error: memberError }, { data: types, error: typeError }, { data: tasks, error: taskError }, { data: completions, error: completionError }] = await Promise.all([
      supabase.from('household_members').select('*').eq('household_id', householdId),
      supabase.from('task_types').select('*').eq('household_id', householdId),
      supabase.from('tasks').select('*').eq('household_id', householdId),
      supabase.from('task_completions').select('task_id, occurrence_date, note, image_url').eq('household_id', householdId),
    ]);
    if (memberError || typeError || taskError || completionError) throw memberError || typeError || taskError || completionError;
    const completionMap = new Map();
    completions.forEach((item) => completionMap.set(`${item.task_id}:${item.occurrence_date}`, item));
    return {
      members: members.map((item) => ({ id: item.id, name: item.display_name, color: item.color, avatar: item.avatar_url || '' })),
      types: types.map((item) => ({ id: item.id, name: item.name, color: item.color })),
      tasks: tasks.map((item) => {
        const taskCompletions = completions.filter((value) => value.task_id === item.id);
        return { id: item.id, title: item.title, description: item.description, typeId: item.type_id || '', memberIds: item.member_id ? [item.member_id] : [], startDate: item.start_date, endDate: item.end_date || undefined, recurrence: item.recurrence, weekdays: item.weekdays || [], completedDates: taskCompletions.map((value) => value.occurrence_date), completionDetails: Object.fromEntries(taskCompletions.map((value) => [value.occurrence_date, { note: value.note || '', image: value.image_url || '' }])) };
      }),
    };
  }

  async function seedRemote(snapshot) {
    const memberMap = new Map();
    for (const [index, member] of snapshot.members.entries()) {
      const id = crypto.randomUUID(); memberMap.set(member.id, id);
      await write(supabase.from('household_members').insert({ id, household_id: householdId, display_name: member.name, color: member.color || colors[index % colors.length], avatar_url: await asDataUrlFile(member.avatar, 'avatar', householdId) || null }));
    }
    const typeMap = new Map();
    for (const [index, type] of snapshot.types.entries()) {
      const id = crypto.randomUUID(); typeMap.set(type.id, id);
      await write(supabase.from('task_types').insert({ id, household_id: householdId, name: type.name, color: type.color || colors[index % colors.length] }));
    }
    for (const task of snapshot.tasks) {
      const id = crypto.randomUUID();
      const { error } = await supabase.from('tasks').insert({ id, household_id: householdId, title: task.title, description: task.description, type_id: typeMap.get(task.typeId) || null, member_id: memberMap.get(task.memberIds[0]) || null, start_date: task.startDate, end_date: task.endDate || null, recurrence: task.recurrence, weekdays: task.weekdays || [] });
      if (error) throw error;
      for (const date of task.completedDates || []) {
        const detail = task.completionDetails?.[date] || {};
        const imageUrl = await asDataUrlFile(detail.image, `completion-${date}`, householdId);
        const { error: completionError } = await supabase.from('task_completions').insert({ household_id: householdId, task_id: id, occurrence_date: date, note: detail.note || '', image_url: imageUrl || null });
        if (completionError) throw completionError;
      }
    }
    local.replaceState(await loadRemote());
  }

  const api = {
    ...local,
    ready,
    getConnectionError: () => readyError,
    getInviteCode: () => inviteCode,
    getInviteSyncStatus: () => inviteSyncStatus,
    hasHousehold: () => Boolean(householdId),
    hasJoinedHousehold: () => localStorage.getItem(joinedHouseholdKey) === householdId,
    async verifyManagementPassword(password) {
      await ready;
      if (!householdId) return canUseInitialFamilyPassword({ hasHousehold: false, password });
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
    getIpadState: () => structuredClone(ipadState),
    createIpadDailyLimit(memberId, date, limitMinutes) { const limit = { id: crypto.randomUUID(), memberId, date, limitMinutes }; ipadState.limits = [...ipadState.limits.filter((item) => !(item.memberId === memberId && item.date === date)), limit]; local.replaceState(local.getState()); sync(() => write(supabase.from('ipad_daily_limits').upsert({ id: limit.id, household_id: householdId, member_id: memberId, usage_date: date, limit_minutes: limitMinutes }, { onConflict: 'member_id,usage_date' }))); return limit; },
    addIpadUsageEntry(entry) { const created = { ...entry, id: crypto.randomUUID(), title: entry.title || '', note: '', endedAt: null }; ipadState.entries.push(created); local.replaceState(local.getState()); sync(() => write(supabase.from('ipad_usage_entries').insert({ id: created.id, household_id: householdId, member_id: created.memberId, daily_limit_id: created.dailyLimitId, type_id: created.typeId, title: created.title || null, started_at: created.startedAt }))); return created; },
    completeIpadUsageEntry(id, endedAt, note = '') { ipadState.entries = ipadState.entries.map((entry) => entry.id === id ? { ...entry, endedAt, note } : entry); local.replaceState(local.getState()); sync(() => write(supabase.from('ipad_usage_entries').update({ ended_at: endedAt, note }).eq('id', id))); },
    addIpadUsageType(memberId, name, countsTowardLimit = true) { const type = { id: crypto.randomUUID(), memberId, name, countsTowardLimit, color: colors[ipadState.types.length % colors.length] }; ipadState.types.push(type); local.replaceState(local.getState()); sync(() => write(supabase.from('ipad_usage_types').insert({ id: type.id, household_id: householdId, member_id: memberId, name, counts_toward_limit: countsTowardLimit, color: type.color }))); return type; },
    updateIpadUsageType(id, patch) { ipadState.types = ipadState.types.map((type) => type.id === id ? { ...type, ...patch } : type); local.replaceState(local.getState()); sync(() => write(supabase.from('ipad_usage_types').update({ name: patch.name, counts_toward_limit: patch.countsTowardLimit }).eq('id', id))); },
    deleteIpadUsageType(id) { ipadState.types = ipadState.types.filter((type) => type.id !== id); local.replaceState(local.getState()); sync(() => write(supabase.from('ipad_usage_types').delete().eq('id', id))); },
    joinHousehold(invite) { return ready.then(async () => { const normalizedInvite = String(invite).trim().toUpperCase(); const { data, error } = await supabase.rpc('join_household_by_invite', { invite_code: normalizedInvite }); if (error) throw error; householdId = data; localStorage.setItem(householdKey, householdId); localStorage.setItem(joinedHouseholdKey, householdId); inviteCode = normalizedInvite; local.replaceState(await loadRemote()); }); },
    addTaskForMember(task, memberId) { local.addTaskForMember(task, memberId); const created = local.getState().tasks[0]; sync(() => write(supabase.from('tasks').insert({ id: created.id, household_id: householdId, title: created.title, description: created.description, type_id: created.typeId || null, member_id: memberId, start_date: created.startDate, recurrence: created.recurrence, weekdays: created.weekdays || [] }))); },
    updateTask(id, patch) { local.updateTask(id, patch); sync(() => write(supabase.from('tasks').update({ title: patch.title, description: patch.description, type_id: patch.typeId || null, start_date: patch.startDate, recurrence: patch.recurrence, weekdays: patch.weekdays || [] }).eq('id', id))); },
    deleteTask(id, scope, fromDate) { local.deleteTask(id, scope, fromDate); sync(async () => { if (scope === 'future') { const end = new Date(`${fromDate}T00:00:00`); end.setDate(end.getDate() - 1); await write(supabase.from('tasks').update({ end_date: end.toISOString().slice(0, 10) }).eq('id', id)); await write(supabase.from('task_completions').delete().eq('task_id', id).gte('occurrence_date', fromDate)); } else await write(supabase.from('tasks').delete().eq('id', id)); }); },
    completeTask(id, date, detail = {}) { local.completeTask(id, date, detail); sync(async () => { const imageUrl = await asDataUrlFile(detail.image, `completion-${date}`, householdId); await write(supabase.from('task_completions').upsert({ household_id: householdId, task_id: id, occurrence_date: date, note: detail.note || '', image_url: imageUrl || null })); }); },
    toggleCompletion(id, date) { local.toggleCompletion(id, date); sync(() => write(supabase.from('task_completions').delete().eq('task_id', id).eq('occurrence_date', date))); },
    addMember(name, avatar) {
      local.addMember(name, avatar);
      const member = local.getState().members.at(-1);
      sync(async () => {
        await ensureHousehold();
        await write(supabase.from('household_members').insert({ id: member.id, household_id: householdId, display_name: name, color: member.color, avatar_url: await asDataUrlFile(avatar, 'avatar', householdId) || null }));
      });
    },
    renameMember(id, name) { local.renameMember(id, name); sync(() => write(supabase.from('household_members').update({ display_name: name }).eq('id', id))); },
    updateMemberAvatar(id, avatar) { local.updateMemberAvatar(id, avatar); sync(async () => write(supabase.from('household_members').update({ avatar_url: await asDataUrlFile(avatar, 'avatar', householdId) || null }).eq('id', id))); },
    deleteMember(id) { local.deleteMember(id); sync(() => write(supabase.from('household_members').delete().eq('id', id))); },
    addType(name) { local.addType(name); const type = local.getState().types.at(-1); sync(() => write(supabase.from('task_types').insert({ id: type.id, household_id: householdId, name, color: type.color }))); },
    renameType(id, name) { local.renameType(id, name); sync(() => write(supabase.from('task_types').update({ name }).eq('id', id))); },
    deleteType(id) { local.deleteType(id); sync(() => write(supabase.from('task_types').delete().eq('id', id))); },
  };
  return api;
}
