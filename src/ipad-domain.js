export function getUsageMinutes(entry) {
  if (!entry?.startedAt || !entry?.endedAt) return 0;
  return Math.max(0, Math.round((new Date(entry.endedAt) - new Date(entry.startedAt)) / 60_000));
}

export function getDailyUsageSummary(limit, entries, types) {
  const limitMinutes = Number(limit?.limitMinutes || 0);
  const typeById = new Map(types.map((type) => [type.id, type]));
  const countedMinutes = entries.reduce((total, entry) => total + (typeById.get(entry.typeId)?.countsTowardLimit ? getUsageMinutes(entry) : 0), 0);
  const overtimeMinutes = Math.max(0, countedMinutes - limitMinutes);
  return { limitMinutes, countedMinutes, remainingMinutes: Math.max(0, limitMinutes - countedMinutes), overtimeMinutes, isOvertime: overtimeMinutes > 0 };
}

export function getIpadDayStatus(summary) {
  return summary?.isOvertime ? 'overtime' : 'within-limit';
}
