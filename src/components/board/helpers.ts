import type { Database, Need, Task } from '@/lib/types';
import { member, tasksForNeed } from '@/lib/derive';

export function approximateStreet(street: string): string {
  const match = street.match(/^(\d+)(\s+.*)$/);
  if (!match) return street;
  return `${Math.floor(Number(match[1]) / 100) * 100} block of${match[2]}`;
}

export function taskForMember(data: Database, need: Need, memberId: string): Task | undefined {
  return tasksForNeed(data, need.id)
    .filter((task) => task.status === 'open' && !task.claimedBy.includes(memberId) && task.claimedBy.length < task.quorum)
    .sort((a, b) => {
      const person = member(data, memberId);
      const overlap = (task: Task) => task.capabilities.filter((capability) => person?.capabilities.includes(capability)).length;
      return overlap(b) - overlap(a) || (a.quorum - a.claimedBy.length) - (b.quorum - b.claimedBy.length) || new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    })[0];
}

export function shortText(text: string, length = 150): string {
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
}
