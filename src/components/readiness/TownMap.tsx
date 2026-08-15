'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Member, Need, NeedUrgency, Task } from '@/lib/types';
import { label, stillNeeded } from '@/lib/derive';

const MIN_LAT = 46.23;
const MAX_LAT = 46.32;
const MIN_LNG = -114.18;
const MAX_LNG = -114.1;
const HARD_CAPABILITIES = ['truck', 'trailer', 'generator', 'pump', 'chainsaw', 'ladder', 'snowblower'] as const;
const urgencyColors: Record<NeedUrgency, string> = {
  routine: '#78716c',
  soon: '#d97706',
  urgent: '#e11d48',
  surge: '#9f1239',
};

function point(need: Need) {
  return {
    x: ((need.lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 800,
    y: ((MAX_LAT - need.lat) / (MAX_LAT - MIN_LAT)) * 500,
  };
}

export function TownMap({ needs, tasks, members }: { needs: Need[]; tasks: Task[]; members: Member[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pinnedNeeds = needs.filter((need) => need.visibility === 'neighborhood');
  const membersByNeighborhood = useMemo(() => {
    const grouped = new Map<string, Member[]>();
    for (const member of members.filter((item) => !item.paused)) {
      const current = grouped.get(member.neighborhood) ?? [];
      current.push(member);
      grouped.set(member.neighborhood, current);
    }
    return grouped;
  }, [members]);
  const neighborhoodSupply = useMemo(() => {
    const grouped = new Map<string, { x: number; y: number; count: number }>();
    for (const need of pinnedNeeds) {
      const current = grouped.get(need.neighborhood) ?? { x: 0, y: 0, count: 0 };
      const location = point(need);
      current.x += location.x;
      current.y += location.y;
      current.count += 1;
      grouped.set(need.neighborhood, current);
    }
    return [...grouped.entries()].map(([name, value]) => ({
      name,
      x: value.x / value.count,
      y: value.y / value.count,
    }));
  }, [pinnedNeeds]);
  const activeMembers = members.filter((member) => !member.paused);
  const equipmentCounts = HARD_CAPABILITIES.map((capability) => ({
    capability,
    count: activeMembers.filter((member) => member.capabilities.includes(capability)).length,
  })).filter((item) => item.count > 0);
  const focusedId = selectedId ?? hoveredId;
  const focusedNeed = pinnedNeeds.find((need) => need.id === focusedId);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-[#f4f1ea]">
        <svg viewBox="0 0 800 500" role="img" aria-label="Map of open neighborhood needs" className="block h-auto w-full">
          <rect width="800" height="500" fill="#f4f1ea" />
          <path d="M0 150 C170 115 275 175 420 145 S650 120 800 150" fill="none" stroke="#d6d3d1" strokeWidth="2" />
          <path d="M0 375 C180 345 300 405 470 360 S650 350 800 380" fill="none" stroke="#e7e5e4" strokeWidth="2" />
          {neighborhoodSupply.map((area) => {
            const areaMembers = membersByNeighborhood.get(area.name) ?? [];
            return (
              <ellipse
                key={`shade-${area.name}`}
                cx={area.x}
                cy={area.y}
                rx="92"
                ry="58"
                fill={areaMembers.length < 2 ? '#fecdd3' : '#d6d3d1'}
                opacity="0.22"
              />
            );
          })}
          {neighborhoodSupply.map((area) => {
            const areaMembers = membersByNeighborhood.get(area.name) ?? [];
            const capabilityCount = new Set(areaMembers.flatMap((member) => member.capabilities)).size;
            return (
              <g key={`area-${area.name}`} pointerEvents="none">
                <text x={area.x} y={area.y - 22} textAnchor="middle" className="fill-stone-700 text-[12px] font-semibold">
                  {area.name}
                </text>
                <text x={area.x} y={area.y - 7} textAnchor="middle" className="fill-stone-600 text-[10px]">
                  {areaMembers.length > 0
                    ? `${areaMembers.length} active · ${capabilityCount} capabilities`
                    : 'no members on record'}
                </text>
                {areaMembers.length === 0 ? (
                  <text x={area.x} y={area.y + 8} textAnchor="middle" className="fill-rose-800 text-[9px]">
                    capability is registered town-wide only
                  </text>
                ) : null}
              </g>
            );
          })}
          {pinnedNeeds.map((need) => {
            const location = point(need);
            const needed = tasks.filter((task) => task.needId === need.id).reduce((sum, task) => sum + stillNeeded(task), 0);
            const radius = 7 + Math.min(needed, 8) * 1.5;
            return (
              <circle
                key={need.id}
                cx={location.x}
                cy={location.y}
                r={radius}
                fill={urgencyColors[need.urgency]}
                fillOpacity="0.9"
                stroke="#fff"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={() => setSelectedId(need.id)}
                onMouseEnter={() => setHoveredId(need.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span><strong className="text-stone-800">{activeMembers.length}</strong> active members town-wide</span>
        <span>
          hard equipment:{' '}
          {equipmentCounts.length > 0 ? equipmentCounts.map((item) => `${item.count} ${label(item.capability)}`).join(' · ') : 'none on record'}
        </span>
      </div>
      {focusedNeed ? (
        <div className="rounded-lg border border-stone-300 bg-white p-3 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{focusedNeed.title}</div>
              <div className="mt-0.5 text-xs text-stone-500">
                {focusedNeed.urgency} · {focusedNeed.street} · {tasks.filter((task) => task.needId === focusedNeed.id).reduce((sum, task) => sum + stillNeeded(task), 0)} still needed
              </div>
            </div>
            <Link href={`/needs/${focusedNeed.id}`} className="text-xs font-medium text-stone-700 underline">
              Open need
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-500">Select a need pin for its street-level callout.</p>
      )}
    </div>
  );
}
