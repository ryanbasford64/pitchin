'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Capability, NeedUrgency } from '@/lib/types';
import { label } from '@/lib/derive';

const MIN_LAT = 46.23;
const MAX_LAT = 46.32;
const MIN_LNG = -114.18;
const MAX_LNG = -114.1;
const urgencyColors: Record<NeedUrgency, string> = {
  routine: '#78716c',
  soon: '#d97706',
  urgent: '#e11d48',
  surge: '#9f1239',
};

type TownMapNeed = {
  id: string;
  title: string;
  urgency: NeedUrgency;
  street: string;
  neighborhood: string;
  lat: number;
  lng: number;
  stillNeeded: number;
};

type NeighborhoodSupply = {
  name: string;
  activeMemberCount: number;
  distinctCapabilityCount: number;
};

type TownMapSupply = {
  neighborhoods: NeighborhoodSupply[];
  activeMemberCount: number;
  hardEquipment: { capability: Capability; count: number }[];
};

function point(need: TownMapNeed) {
  return {
    x: ((need.lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 800,
    y: ((MAX_LAT - need.lat) / (MAX_LAT - MIN_LAT)) * 500,
  };
}

export function TownMap({ needs, supply }: { needs: TownMapNeed[]; supply: TownMapSupply }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const neighborhoodSupply = supply.neighborhoods.map((area) => {
    const areaNeeds = needs.filter((need) => need.neighborhood === area.name);
    const coordinates = areaNeeds.reduce(
      (sum, need) => {
        const location = point(need);
        return { x: sum.x + location.x, y: sum.y + location.y };
      },
      { x: 0, y: 0 },
    );
    return {
      ...area,
      x: coordinates.x / areaNeeds.length,
      y: coordinates.y / areaNeeds.length,
    };
  });
  const focusedId = selectedId ?? hoveredId;
  const focusedNeed = needs.find((need) => need.id === focusedId);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-[#f4f1ea]">
        <svg viewBox="0 0 800 500" role="img" aria-label="Map of open neighborhood needs" className="block h-auto w-full">
          <rect width="800" height="500" fill="#f4f1ea" />
          <path d="M0 150 C170 115 275 175 420 145 S650 120 800 150" fill="none" stroke="#d6d3d1" strokeWidth="2" />
          <path d="M0 375 C180 345 300 405 470 360 S650 350 800 380" fill="none" stroke="#e7e5e4" strokeWidth="2" />
          {neighborhoodSupply.map((area) => {
            return (
              <ellipse
                key={`shade-${area.name}`}
                cx={area.x}
                cy={area.y}
                rx="92"
                ry="58"
                fill={area.activeMemberCount < 2 ? '#fecdd3' : '#d6d3d1'}
                opacity="0.22"
              />
            );
          })}
          {neighborhoodSupply.map((area) => {
            return (
              <g key={`area-${area.name}`} pointerEvents="none">
                <text x={area.x} y={area.y - 22} textAnchor="middle" className="fill-stone-700 text-[12px] font-semibold">
                  {area.name}
                </text>
                <text x={area.x} y={area.y - 7} textAnchor="middle" className="fill-stone-600 text-[10px]">
                  {area.activeMemberCount > 0
                    ? `${area.activeMemberCount} active · ${area.distinctCapabilityCount} capabilities`
                    : 'no members on record'}
                </text>
                {area.activeMemberCount === 0 ? (
                  <text x={area.x} y={area.y + 8} textAnchor="middle" className="fill-rose-800 text-[9px]">
                    capability is registered town-wide only
                  </text>
                ) : null}
              </g>
            );
          })}
          {needs.map((need) => {
            const location = point(need);
            const radius = 7 + Math.min(need.stillNeeded, 8) * 1.5;
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
        <span><strong className="text-stone-800">{supply.activeMemberCount}</strong> active members town-wide</span>
        <span>
          hard equipment:{' '}
          {supply.hardEquipment.length > 0 ? supply.hardEquipment.map((item) => `${item.count} ${label(item.capability)}`).join(' · ') : 'none on record'}
        </span>
      </div>
      {focusedNeed ? (
        <div className="rounded-lg border border-stone-300 bg-white p-3 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{focusedNeed.title}</div>
              <div className="mt-0.5 text-xs text-stone-500">
                {focusedNeed.urgency} · {focusedNeed.street} · {focusedNeed.stillNeeded} still needed
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
