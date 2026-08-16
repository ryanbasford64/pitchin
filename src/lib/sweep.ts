// The unmet sweep. Without it, a need nobody claimed sits "open" forever and the town
// never has to look at what it failed to field.
import { atQuorum, tasksForNeed } from './derive';
import type { Database, Need, Task } from './types';

/**
 * Close out needs whose deadline has passed with no task still being worked. A task counts as
 * live work only while it is done, staffed, or open with claims at quorum — a task that already
 * resolved unmet because nobody showed is a miss, not somebody still working it.
 */
export function sweepUnmetNeeds(data: Database, now = Date.now()): Need[] {
  const swept: Need[] = [];
  for (const item of data.needs) {
    if (item.status !== 'open' && item.status !== 'staffed') continue;
    if (!item.neededBy || new Date(item.neededBy).getTime() > now) continue;
    const tasks = tasksForNeed(data, item.id);
    if (tasks.length === 0) continue;
    const live = (t: Task) =>
      t.status === 'done' || t.status === 'staffed' || (t.status === 'open' && atQuorum(t));
    if (tasks.some(live)) continue;
    for (const t of tasks) {
      if (t.status === 'open') t.status = 'unmet';
    }
    item.status = 'unmet';
    swept.push(item);
  }
  return swept;
}

/** Needs already past their deadline that the next sweep would close as unmet. */
export function overdueNeeds(data: Database, now = Date.now()): Need[] {
  const clone: Database = JSON.parse(JSON.stringify(data)) as Database;
  const ids = new Set(sweepUnmetNeeds(clone, now).map((item) => item.id));
  return data.needs.filter((item) => ids.has(item.id));
}
