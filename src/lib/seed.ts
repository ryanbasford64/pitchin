// A seeded demo town: Hamilton, Montana (Ravalli County). Small enough to hold in
// your head, real enough to argue with.
import type {
  AfterActionReport,
  Commitment,
  Crew,
  Database,
  Member,
  Need,
  Task,
} from './types';

function mondayOf(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - ((day + 6) % 7));
  return copy.toISOString().slice(0, 10);
}

function at(weekStart: string, dayOffset: number, hour: number, minute = 0): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function seedDatabase(): Database {
  const weekOf = mondayOf(new Date());
  const lastWeek = mondayOf(new Date(Date.now() - 7 * 864e5));

  const members: Member[] = [
    m('mem_dana', 'Dana Whitfield', '212 S 4th St', ['clerical', 'driving', 'cooking'], ['meeting_minutes', 'elder_checkin'], 41, 39, 0, { coordinator: true }),
    m('mem_marcus', 'Marcus Oyelaran', '88 Ricketts Rd', ['truck', 'heavy_lifting', 'chainsaw'], ['chainsaw_operator'], 63, 61, 1),
    m('mem_ruth', 'Ruth Kessler', '410 Bedford St', ['cooking', 'childcare', 'clerical'], ['elder_checkin'], 55, 55, 0),
    m('mem_tomas', 'Tomás Herrera', '19 Fairgrounds Rd', ['spanish', 'tools', 'driving'], ['interpreter_spanish', 'first_aid'], 48, 45, 1),
    m('mem_junie', 'Junie Ballard', '77 Skalkaho Hwy', ['generator', 'pump', 'tools'], ['pump_operator', 'wildfire_prep'], 37, 36, 0),
    m('mem_ellis', 'Ellis Trapp', '5 Corvallis Loop', ['trailer', 'truck', 'snowblower'], [], 22, 18, 3),
    m('mem_paulette', 'Paulette Nance', '330 Madison St', ['medical', 'clerical'], ['first_aid'], 30, 29, 0),
    m('mem_wade', 'Wade Sirmon', '61 Golf Course Rd', ['chainsaw', 'ladder', 'heavy_lifting'], ['chainsaw_operator', 'wildfire_prep'], 44, 40, 2),
    m('mem_lena', 'Lena Broussard', '900 Main St', ['cooking', 'clerical', 'driving'], [], 12, 12, 0),
    m('mem_curtis', 'Curtis Ahn', '145 Kurtz Ln', ['tools', 'heavy_lifting', 'ladder'], [], 26, 23, 1),
    m('mem_bea', 'Bea Lindgren', '58 Blodgett View', ['childcare', 'cooking'], ['elder_checkin'], 19, 19, 0),
    m('mem_sam', 'Sam Rooks', '702 Pine St', ['driving', 'clerical'], [], 8, 6, 2, { paused: true }),
    // Neighbors who mostly ask rather than offer. They are members too.
    m('mem_doris', 'Doris Kemp', '412 S 3rd St', [], [], 0, 0, 0),
    m('mem_hansen', 'Ada Hansen', '1140 Eastside Hwy', [], [], 3, 3, 0),
  ];

  const crews: Crew[] = [
    { id: 'crew_bitterroot', name: 'Bitterroot Crew', leadId: 'mem_marcus', memberIds: ['mem_marcus', 'mem_wade', 'mem_curtis', 'mem_ellis'], streakWeeks: 9 },
    { id: 'crew_westside', name: 'Westside Crew', leadId: 'mem_ruth', memberIds: ['mem_ruth', 'mem_bea', 'mem_lena', 'mem_paulette'], streakWeeks: 14 },
    { id: 'crew_skalkaho', name: 'Skalkaho Crew', leadId: 'mem_junie', memberIds: ['mem_junie', 'mem_tomas', 'mem_dana', 'mem_sam'], streakWeeks: 4 },
  ];
  for (const crew of crews) {
    for (const memberId of crew.memberIds) {
      const found = members.find((x) => x.id === memberId);
      if (found) found.crewId = crew.id;
    }
  }

  const needs: Need[] = [
    {
      id: 'need_woodpile',
      title: "Move Doris Kemp's woodpile before the freeze",
      rawText:
        "My mom is 84 and has about a cord of wood sitting in the driveway that needs to get stacked on the porch before it freezes. She can't do it and I'm in Missoula until the 20th.",
      requesterId: 'mem_doris',
      postedById: 'mem_lena',
      neighborhood: 'Hamilton South',
      street: '412 S 3rd St',
      lat: 46.2405,
      lng: -114.1608,
      visibility: 'neighborhood',
      urgency: 'soon',
      status: 'open',
      createdAt: at(weekOf, 1, 18, 12),
      neededBy: at(weekOf, 6, 17),
      taskIds: ['task_wood_stack', 'task_wood_tarp'],
      publishConsent: true,
    },
    {
      id: 'need_ramp',
      title: 'Build a temporary wheelchair ramp on Madison St',
      rawText:
        'Neighbor came home from the hospital and there are four steps to the front door. Needs a ramp that will hold up through winter. I have some lumber.',
      requesterId: 'mem_paulette',
      postedById: null,
      neighborhood: 'Hamilton West',
      street: '330 Madison St',
      lat: 46.2472,
      lng: -114.1651,
      visibility: 'neighborhood',
      urgency: 'urgent',
      status: 'open',
      createdAt: at(weekOf, 0, 9, 30),
      neededBy: at(weekOf, 5, 12),
      taskIds: ['task_ramp_build', 'task_ramp_haul'],
      publishConsent: false,
    },
    {
      id: 'need_interpreter',
      title: 'Interpreter for a school meeting Thursday',
      rawText:
        'A family at Washington Elementary has an IEP meeting Thursday afternoon and no interpreter. Spanish. About an hour.',
      requesterId: 'mem_dana',
      postedById: null,
      neighborhood: 'Hamilton Central',
      street: '625 Main St',
      lat: 46.2489,
      lng: -114.16,
      visibility: 'neighborhood',
      urgency: 'soon',
      status: 'staffed',
      createdAt: at(lastWeek, 4, 15),
      neededBy: at(weekOf, 3, 15),
      taskIds: ['task_interpret'],
      publishConsent: true,
    },
    {
      id: 'need_checkins',
      title: 'Cold-snap check-ins on eleven older neighbors',
      rawText:
        'Forecast is -14 this weekend. We have eleven people on the check-in list and I can get to four of them.',
      requesterId: 'mem_ruth',
      postedById: null,
      neighborhood: 'Hamilton West',
      street: '410 Bedford St',
      lat: 46.2451,
      lng: -114.1702,
      visibility: 'neighborhood',
      urgency: 'urgent',
      status: 'open',
      createdAt: at(weekOf, 2, 8),
      neededBy: at(weekOf, 5, 20),
      taskIds: ['task_checkin_north', 'task_checkin_south'],
      publishConsent: true,
    },
    {
      id: 'need_pump',
      title: 'Pump out a flooded basement on Eastside Hwy',
      rawText: 'Water heater let go overnight. Maybe eight inches in the basement.',
      requesterId: 'mem_hansen',
      postedById: null,
      neighborhood: 'Corvallis',
      street: '1140 Eastside Hwy',
      lat: 46.3092,
      lng: -114.117,
      visibility: 'neighborhood',
      urgency: 'routine',
      status: 'done',
      createdAt: at(lastWeek, 2, 6, 40),
      neededBy: at(lastWeek, 2, 12),
      taskIds: ['task_pump_out'],
      publishConsent: true,
    },
    {
      id: 'need_private_rent',
      title: 'Help sorting a stack of bills and a rent letter',
      rawText:
        "I got a letter from my landlord and I don't understand it, and I have a shoebox of bills I've been afraid to open. I'd rather nobody know.",
      requesterId: 'mem_sam',
      postedById: null,
      neighborhood: 'Hamilton Central',
      street: '702 Pine St',
      lat: 46.2517,
      lng: -114.1584,
      visibility: 'private',
      urgency: 'soon',
      status: 'open',
      createdAt: at(weekOf, 2, 21, 10),
      neededBy: null,
      taskIds: ['task_bills'],
      publishConsent: false,
    },
  ];

  const tasks: Task[] = [
    t('task_wood_stack', 'need_woodpile', 'Stack a cord of wood on the porch', 45, 3, ['heavy_lifting'], [], [], at(weekOf, 5, 9), ['mem_marcus', 'mem_curtis']),
    t('task_wood_tarp', 'need_woodpile', 'Tarp and tie down the remainder', 20, 1, ['tools'], [], ['tarp', 'bungees'], at(weekOf, 5, 10), []),
    t('task_ramp_build', 'need_ramp', 'Frame and deck a 12-foot ramp', 180, 3, ['tools', 'heavy_lifting'], [], ['lumber', 'deck screws', 'circular saw'], at(weekOf, 4, 8), ['mem_wade']),
    t('task_ramp_haul', 'need_ramp', 'Haul lumber from the yard on Fairgrounds', 40, 1, ['truck'], [], [], at(weekOf, 3, 17), ['mem_ellis']),
    t('task_interpret', 'need_interpreter', 'Interpret at the IEP meeting', 60, 1, ['spanish'], ['interpreter_spanish'], [], at(weekOf, 3, 15), ['mem_tomas']),
    t('task_checkin_north', 'need_checkins', 'Check in on six neighbors north of Main', 90, 2, ['driving'], ['elder_checkin'], [], at(weekOf, 5, 10), ['mem_bea']),
    t('task_checkin_south', 'need_checkins', 'Check in on five neighbors south of Main', 75, 2, ['driving'], ['elder_checkin'], [], at(weekOf, 5, 10), []),
    t('task_pump_out', 'need_pump', 'Pump out and squeegee the basement', 120, 2, ['pump', 'generator'], ['pump_operator'], ['trash pump', 'hose'], at(lastWeek, 2, 8), ['mem_junie', 'mem_marcus'], 'done'),
    t('task_bills', 'need_private_rent', 'Sit down with the mail and make a list', 45, 1, ['clerical'], [], [], at(weekOf, 6, 14), []),
  ];

  const commitments: Commitment[] = [
    c('cmt_1', 'mem_marcus', 'task_wood_stack', 'need_woodpile', at(weekOf, 1, 19), true, 'committed'),
    c('cmt_2', 'mem_curtis', 'task_wood_stack', 'need_woodpile', at(weekOf, 2, 7, 15), true, 'committed'),
    c('cmt_3', 'mem_wade', 'task_ramp_build', 'need_ramp', at(weekOf, 0, 12), true, 'committed'),
    c('cmt_4', 'mem_ellis', 'task_ramp_haul', 'need_ramp', at(weekOf, 1, 20), false, 'committed'),
    c('cmt_5', 'mem_tomas', 'task_interpret', 'need_interpreter', at(lastWeek, 5, 9), true, 'committed'),
    c('cmt_6', 'mem_bea', 'task_checkin_north', 'need_checkins', at(weekOf, 2, 9), true, 'committed'),
    c('cmt_7', 'mem_junie', 'task_pump_out', 'need_pump', at(lastWeek, 2, 7), false, 'kept', 'mem_hansen', at(lastWeek, 2, 11)),
    c('cmt_8', 'mem_marcus', 'task_pump_out', 'need_pump', at(lastWeek, 2, 7, 10), true, 'kept', 'mem_hansen', at(lastWeek, 2, 11)),
    c('cmt_9', 'mem_ellis', 'task_pump_out', 'need_pump', at(lastWeek, 2, 7, 20), false, 'no_show'),
  ];

  const reports: AfterActionReport[] = [
    {
      id: 'aar_pump',
      needId: 'need_pump',
      publishedAt: at(lastWeek, 3, 9),
      whatWasNeeded: 'Eight inches of water in a basement on Eastside Hwy after a water heater failed.',
      turnout: ['mem_junie', 'mem_marcus'],
      personMinutes: 240,
      materielUsed: ['trash pump', '100ft discharge hose', 'two squeegees'],
      whatWorked:
        'Junie was on site 41 minutes after the need was posted because the pump lives in her shop and the registry knew it.',
      whatWeWouldChange:
        'We had no second pump operator available; if this happens during a real surge we are one person deep. Two more people should sit for the qual.',
      wordFromRequester: 'I called my insurance company and then I called PitchIn, and PitchIn got here first. — Ada H.',
    },
  ];

  return { members, crews, needs, tasks, commitments, reports, surges: [], weekOf };
}

// ---------- tiny constructors, kept terse so the seed reads as data ----------

function m(
  id: string,
  name: string,
  street: string,
  capabilities: Member['capabilities'],
  quals: Member['quals'][number]['qual'][],
  made: number,
  kept: number,
  noShows: number,
  opts: { coordinator?: boolean; paused?: boolean } = {},
): Member {
  return {
    id,
    name,
    street,
    neighborhood: 'Hamilton',
    joinedOn: '2026-02-01',
    capabilities,
    quals: quals.map((q) => ({ qual: q, grantedBy: 'mem_dana', grantedOn: '2026-03-14', expiresOn: null })),
    availability: [
      { weekday: 6, startHour: 8, endHour: 12 },
      { weekday: 3, startHour: 17, endHour: 20 },
    ],
    radiusMiles: 12,
    crewId: null,
    commitmentsMade: made,
    commitmentsKept: kept,
    noShows,
    paused: opts.paused ?? false,
    isCoordinator: opts.coordinator ?? false,
    phone: '406-555-0100',
  };
}

function t(
  id: string,
  needId: string,
  title: string,
  minutes: number,
  quorum: number,
  capabilities: Task['capabilities'],
  quals: Task['quals'],
  materiel: string[],
  scheduledFor: string,
  claimedBy: string[],
  status: Task['status'] = 'open',
): Task {
  const resolved: Task['status'] =
    status === 'open' && claimedBy.length >= quorum ? 'staffed' : status;
  return { id, needId, title, minutes, quorum, capabilities, quals, materiel, scheduledFor, claimedBy, status: resolved };
}

function c(
  id: string,
  memberId: string,
  taskId: string,
  needId: string,
  committedAt: string,
  isWeeklyPitch: boolean,
  status: Commitment['status'],
  verifiedBy: string | null = null,
  verifiedAt: string | null = null,
): Commitment {
  return { id, memberId, taskId, needId, committedAt, isWeeklyPitch, status, verifiedBy, verifiedAt };
}
