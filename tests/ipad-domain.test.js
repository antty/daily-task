import test from 'node:test';
import assert from 'node:assert/strict';
import { getDailyUsageSummary, getIpadDayStatus } from '../src/ipad-domain.js';

test('only completed usage types that count toward the limit consume the daily quota', () => {
  const summary = getDailyUsageSummary(
    { limitMinutes: 60 },
    [
      { typeId: 'game', startedAt: '2026-07-15T10:00:00Z', endedAt: '2026-07-15T10:45:00Z' },
      { typeId: 'study', startedAt: '2026-07-15T11:00:00Z', endedAt: '2026-07-15T11:30:00Z' },
      { typeId: 'open', startedAt: '2026-07-15T12:00:00Z', endedAt: null },
    ],
    [{ id: 'game', countsTowardLimit: true }, { id: 'study', countsTowardLimit: false }],
  );

  assert.deepEqual(summary, { limitMinutes: 60, countedMinutes: 45, remainingMinutes: 15, overtimeMinutes: 0, isOvertime: false });
  assert.equal(getIpadDayStatus(summary), 'within-limit');
});

test('counted usage over the daily quota reports overtime while excluded types remain ignored', () => {
  const summary = getDailyUsageSummary(
    { limitMinutes: 60 },
    [
      { typeId: 'game', startedAt: '2026-07-15T10:00:00Z', endedAt: '2026-07-15T10:40:00Z' },
      { typeId: 'game', startedAt: '2026-07-15T11:00:00Z', endedAt: '2026-07-15T11:40:00Z' },
      { typeId: 'study', startedAt: '2026-07-15T12:00:00Z', endedAt: '2026-07-15T13:30:00Z' },
    ],
    [{ id: 'game', countsTowardLimit: true }, { id: 'study', countsTowardLimit: false }],
  );

  assert.equal(summary.countedMinutes, 80);
  assert.equal(summary.overtimeMinutes, 20);
  assert.equal(summary.isOvertime, true);
  assert.equal(getIpadDayStatus(summary), 'overtime');
});
