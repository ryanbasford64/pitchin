// PitchIn — shared domain types. People helping people.
// This file is the contract between all vertical slices. Additive changes only.

export type Uuid = string;

/** Capabilities are things a person actually has, not things they intend. */
export type Capability =
  | 'truck'
  | 'trailer'
  | 'chainsaw'
  | 'generator'
  | 'pump'
  | 'ladder'
  | 'snowblower'
  | 'tools'
  | 'cooking'
  | 'childcare'
  | 'driving'
  | 'heavy_lifting'
  | 'spanish'
  | 'asl'
  | 'medical'
  | 'clerical';

/** Quals are earned by demonstration and decide who gets called in a surge. */
export type Qual =
  | 'chainsaw_operator'
  | 'pump_operator'
  | 'interpreter_spanish'
  | 'wildfire_prep'
  | 'elder_checkin'
  | 'meeting_minutes'
  | 'first_aid';

export interface QualGrant {
  qual: Qual;
  grantedBy: Uuid;
  grantedOn: string; // ISO date
  expiresOn: string | null;
}

export interface AvailabilityWindow {
  /** 0 = Sunday */
  weekday: number;
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export interface Member {
  id: Uuid;
  name: string;
  street: string;
  neighborhood: string;
  joinedOn: string;
  capabilities: Capability[];
  quals: QualGrant[];
  availability: AvailabilityWindow[];
  radiusMiles: number;
  crewId: Uuid | null;
  /** Commitments kept / commitments made. Derived; cached here for reads. */
  commitmentsMade: number;
  commitmentsKept: number;
  noShows: number;
  paused: boolean;
  isCoordinator: boolean;
  phone: string;
}

export interface Crew {
  id: Uuid;
  name: string;
  leadId: Uuid;
  memberIds: Uuid[];
  /** Consecutive weeks in which every unpaused member kept their pitch. */
  streakWeeks: number;
}

export type NeedVisibility = 'neighborhood' | 'crews_only' | 'private';

/** What the requester says about the outcome, which is not the same as turnout. */
export type NeedResolution = 'solved' | 'partly' | 'not_solved';

export interface ResolutionRecord {
  resolution: NeedResolution;
  note: string | null;
  /** The requester, or a coordinator writing down what the requester said. */
  recordedBy: Uuid;
  onBehalfOfRequester: boolean;
  recordedAt: string;
}

export type NeedStatus = 'draft' | 'open' | 'staffed' | 'done' | 'unmet' | 'cancelled';
export type NeedUrgency = 'routine' | 'soon' | 'urgent' | 'surge';

/** A need decomposes into tasks. Tasks are what people claim. */
export interface Task {
  id: Uuid;
  needId: Uuid;
  title: string;
  minutes: number;
  /** Minimum headcount. A task does not launch below quorum. */
  quorum: number;
  capabilities: Capability[];
  quals: Qual[];
  materiel: string[];
  scheduledFor: string; // ISO datetime
  claimedBy: Uuid[];
  status: 'open' | 'staffed' | 'done' | 'unmet';
}

export interface Need {
  id: Uuid;
  title: string;
  /** The plain-English ask, exactly as the neighbor wrote it. */
  rawText: string;
  requesterId: Uuid;
  /** Set when someone posts on behalf of a neighbor, with consent. */
  postedById: Uuid | null;
  neighborhood: string;
  street: string;
  lat: number;
  lng: number;
  visibility: NeedVisibility;
  urgency: NeedUrgency;
  status: NeedStatus;
  createdAt: string;
  neededBy: string | null;
  taskIds: Uuid[];
  /** Requester consent to name them in the public after-action report. */
  publishConsent: boolean;
  questions?: LogisticsQuestion[];
  /** Answered by the requester after the work, never inferred from attendance. */
  resolution?: ResolutionRecord | null;
}

export interface LogisticsQuestion {
  id: Uuid;
  needId: Uuid;
  askedBy: Uuid;
  question: string;
  askedAt: string;
  answer: string | null;
  answeredBy: Uuid | null;
  answeredAt: string | null;
}

/** A promise with a name on it. The unit the reward system is built on. */
export interface Commitment {
  id: Uuid;
  memberId: Uuid;
  taskId: Uuid;
  needId: Uuid;
  committedAt: string;
  /** The weekly pitch, as opposed to an ad-hoc claim off the Board. */
  isWeeklyPitch: boolean;
  status: 'committed' | 'declined' | 'kept' | 'no_show';
  /** Verification always comes from the requester, never the helper. */
  verifiedBy: Uuid | null;
  verifiedAt: string | null;
}

export interface AfterActionReport {
  id: Uuid;
  needId: Uuid;
  publishedAt: string;
  whatWasNeeded: string;
  turnout: Uuid[];
  personMinutes: number;
  materielUsed: string[];
  whatWorked: string;
  whatWeWouldChange: string;
  /** Published only with requester consent. */
  wordFromRequester: string | null;
}

export interface Surge {
  id: Uuid;
  name: string;
  declaredAt: string;
  declaredBy: Uuid;
  quals: Qual[];
  standDownAt: string | null;
  rollCall: { memberId: Uuid; response: 'yes' | 'no' | 'pending'; respondedAt: string | null }[];
}

export interface Database {
  members: Member[];
  crews: Crew[];
  needs: Need[];
  tasks: Task[];
  commitments: Commitment[];
  reports: AfterActionReport[];
  surges: Surge[];
  /** ISO date of the Monday that starts the current pitch week. */
  weekOf: string;
}

// ---------- derived read models ----------

export interface ShowRate {
  made: number;
  kept: number;
  /** 0-1; null when nothing has been committed yet. */
  rate: number | null;
}

export interface ReadinessSnapshot {
  membersReadyThisWeek: number;
  membersTotal: number;
  capabilityCounts: Record<string, number>;
  qualCounts: Record<string, number>;
  /** Capabilities and quals the town cannot field right now. */
  gaps: string[];
  /** Needs whose tasks were staffed and closed. Staffing is not the same as solving. */
  needsMetThisMonth: number;
  needsResolvedThisMonth: number;
  needsPartlyResolvedThisMonth: number;
  needsUnmetThisMonth: number;
  /** Closed needs whose requester has not yet said whether it worked. */
  needsAwaitingResolution: number;
  needsOpen: number;
  townShowRate: number | null;
}
