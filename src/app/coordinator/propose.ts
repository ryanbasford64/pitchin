import type { Capability, Need, Qual } from '@/lib/types';

export interface TaskDraft {
  title: string;
  minutes: number;
  quorum: number;
  capabilities: Capability[];
  quals: Qual[];
  materiel: string[];
  scheduledFor: string;
}

const rules: { keywords: string[]; draft: Omit<TaskDraft, 'scheduledFor'> }[] = [
  { keywords: ['wood', 'cord', 'firewood', 'stack'], draft: { title: 'Stack and move the woodpile', minutes: 45, quorum: 3, capabilities: ['heavy_lifting'], quals: [], materiel: ['work gloves'] } },
  { keywords: ['tarp', 'freeze', 'cover', 'snow'], draft: { title: 'Tarp and tie down what is left outside', minutes: 20, quorum: 1, capabilities: ['tools'], quals: [], materiel: ['tarp', 'bungees'] } },
  { keywords: ['ramp', 'steps', 'deck', 'build', 'wheelchair'], draft: { title: 'Frame and deck the ramp', minutes: 180, quorum: 3, capabilities: ['tools', 'heavy_lifting'], quals: [], materiel: ['lumber', 'deck screws', 'circular saw'] } },
  { keywords: ['lumber', 'haul', 'load', 'yard', 'materials'], draft: { title: 'Haul materials to the site', minutes: 40, quorum: 1, capabilities: ['truck'], quals: [], materiel: [] } },
  { keywords: ['basement', 'water', 'flood', 'pump', 'sump'], draft: { title: 'Pump out and squeegee', minutes: 120, quorum: 2, capabilities: ['pump', 'generator'], quals: ['pump_operator'], materiel: ['trash pump', 'discharge hose'] } },
  { keywords: ['spanish', 'interpreter', 'interpret', 'iep', 'school meeting', 'meeting'], draft: { title: 'Interpret at the meeting', minutes: 60, quorum: 1, capabilities: ['spanish'], quals: ['interpreter_spanish'], materiel: [] } },
  { keywords: ['check on', 'check-in', 'check in', 'older', 'elderly', 'cold snap', 'welfare'], draft: { title: 'Check in on the neighbors on the list', minutes: 90, quorum: 2, capabilities: ['driving'], quals: ['elder_checkin'], materiel: [] } },
  { keywords: ['bills', 'letter', 'landlord', 'rent', 'paperwork', 'forms', 'mail'], draft: { title: 'Sit down with the mail and make a list', minutes: 45, quorum: 1, capabilities: ['clerical'], quals: [], materiel: [] } },
  { keywords: ['tree', 'limb', 'branch', 'chainsaw', 'brush'], draft: { title: 'Cut and clear limbs', minutes: 120, quorum: 2, capabilities: ['chainsaw'], quals: ['chainsaw_operator'], materiel: [] } },
  { keywords: ['meal', 'cook', 'food', 'groceries'], draft: { title: 'Cook and deliver meals', minutes: 60, quorum: 2, capabilities: ['cooking'], quals: [], materiel: [] } },
  { keywords: ['ride', 'drive', 'appointment', 'clinic'], draft: { title: 'Drive to the appointment', minutes: 60, quorum: 1, capabilities: ['driving'], quals: [], materiel: [] } },
  { keywords: ['kids', 'child', 'childcare', 'babysit'], draft: { title: 'Watch the kids during the work', minutes: 120, quorum: 1, capabilities: ['childcare'], quals: [], materiel: [] } },
];

export function proposeTasks(need: Need, now = new Date()): TaskDraft[] {
  const haystack = `${need.rawText} ${need.title}`.toLowerCase();
  const selected = rules.filter((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)));
  const drafts = selected.length ? selected.map((rule) => rule.draft) : [
    { title: 'Sit down with the neighbor and scope the job', minutes: 45, quorum: 1, capabilities: ['clerical'] as Capability[], quals: [] as Qual[], materiel: [] },
  ];
  const base = new Date(need.neededBy ?? now.getTime() + 3 * 864e5);
  base.setUTCHours(9, 0, 0, 0);
  return drafts.map((draft, index) => ({
    ...draft,
    scheduledFor: new Date(base.getTime() + index * 3600000).toISOString(),
  }));
}
