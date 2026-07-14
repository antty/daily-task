const DAY = 86_400_000;

export function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function datesBetween(start, end) {
  const result = [];
  for (let time = parseDate(start).getTime(); time <= parseDate(end).getTime(); time += DAY) result.push(toDateKey(new Date(time)));
  return result;
}

export function occursOn(task, date) {
  if (date < task.startDate || (task.endDate && date > task.endDate)) return false;
  if (task.recurrence === 'daily') return true;
  if (task.recurrence === 'weekly') {
    const weekdays = task.weekdays?.length ? task.weekdays : [(parseDate(task.startDate).getDay() + 6) % 7];
    return weekdays.includes((parseDate(date).getDay() + 6) % 7);
  }
  return task.startDate === date;
}

export function buildOccurrences(tasks, start, end) {
  return datesBetween(start, end).flatMap((date) => tasks
    .filter((task) => occursOn(task, date))
    .map((task) => ({ taskId: task.id, task, date, completed: task.completedDates.includes(date) })));
}

export function getDaySummary(occurrences, date) {
  const days = occurrences.filter((item) => item.date === date);
  const completed = days.filter((item) => item.completed).length;
  return { total: days.length, completed, progress: days.length ? completed / days.length : 0 };
}
