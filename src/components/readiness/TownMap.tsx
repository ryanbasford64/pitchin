'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Capability, NeedUrgency } from '@/lib/types';
import { label } from '@/lib/derive';

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 360;
const MIN_LAT_SPAN = 0.015;
const MIN_LNG_SPAN = 0.015;
const PROPORTIONAL_PADDING = 0.15;
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

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function fitBounds(needs: TownMapNeed[]): MapBounds {
  if (needs.length === 0) {
    return {
      minLat: -MIN_LAT_SPAN / 2,
      maxLat: MIN_LAT_SPAN / 2,
      minLng: -MIN_LNG_SPAN / 2,
      maxLng: MIN_LNG_SPAN / 2,
    };
  }
  const lats = needs.map((need) => need.lat);
  const lngs = needs.map((need) => need.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latCenter = (minLat + maxLat) / 2;
  const lngCenter = (minLng + maxLng) / 2;
  const latSpan = Math.max(maxLat - minLat, MIN_LAT_SPAN);
  const lngSpan = Math.max(maxLng - minLng, MIN_LNG_SPAN);
  const paddedLatSpan = latSpan * (1 + PROPORTIONAL_PADDING * 2);
  const paddedLngSpan = lngSpan * (1 + PROPORTIONAL_PADDING * 2);
  return {
    minLat: latCenter - paddedLatSpan / 2,
    maxLat: latCenter + paddedLatSpan / 2,
    minLng: lngCenter - paddedLngSpan / 2,
    maxLng: lngCenter + paddedLngSpan / 2,
  };
}

function point(need: TownMapNeed, bounds: MapBounds) {
  return {
    x: ((need.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * VIEWBOX_WIDTH,
    y: ((bounds.maxLat - need.lat) / (bounds.maxLat - bounds.minLat)) * VIEWBOX_HEIGHT,
  };
}

function shortTitle(title: string) {
  return title.length > 28 ? `${title.slice(0, 27)}…` : title;
}

export function TownMap({ needs, supply }: { needs: TownMapNeed[]; supply: TownMapSupply }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const bounds = fitBounds(needs);
  const neighborhoodSupply = supply.neighborhoods.map((area) => {
    const areaNeeds = needs.filter((need) => need.neighborhood === area.name);
    const coordinates = areaNeeds.reduce(
      (sum, need) => {
        const location = point(need, bounds);
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
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-[var(--map-paper)]">
        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="img" aria-label="Map of open neighborhood needs" className="block h-auto max-h-[360px] w-full">
          <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--map-paper)" />
          <path d="M0 100 C170 75 275 120 420 95 S650 80 800 105" fill="none" stroke="var(--map-line-strong)" strokeWidth="2" />
          <path d="M0 270 C180 245 300 290 470 255 S650 250 800 275" fill="none" stroke="var(--map-line-soft)" strokeWidth="2" />
          {neighborhoodSupply.map((area) => {
            return (
              <ellipse
                key={`shade-${area.name}`}
                cx={area.x}
                cy={area.y}
                rx="42"
                ry="28"
                fill={area.activeMemberCount < 2 ? 'var(--map-shade-thin)' : 'var(--map-shade)'}
                opacity="0.28"
                stroke={area.activeMemberCount < 2 ? '#be123c' : '#a8a29e'}
                strokeDasharray="4 3"
                strokeWidth="1.5"
              />
            );
          })}
          {neighborhoodSupply.map((area) => {
            return (
              <circle
                key={`area-${area.name}`}
                cx={area.x}
                cy={area.y}
                r="4"
                fill={area.activeMemberCount < 2 ? '#be123c' : '#78716c'}
                stroke="var(--map-paper)"
                strokeWidth="1.5"
                pointerEvents="none"
              />
            );
          })}
          {needs.map((need) => {
            const location = point(need, bounds);
            const radius = 7 + Math.min(need.stillNeeded, 8) * 1.5;
            return (
              <circle
                key={need.id}
                cx={location.x}
                cy={location.y}
                r={radius}
                fill={urgencyColors[need.urgency]}
                fillOpacity="0.9"
                stroke="var(--map-paper)"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={() => setSelectedId(need.id)}
                onMouseEnter={() => setHoveredId(need.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}
          {needs.map((need) => {
            const location = point(need, bounds);
            const labelOnLeft = location.x > VIEWBOX_WIDTH * 0.62;
            const labelX = labelOnLeft
              ? Math.max(location.x - 24, 8)
              : Math.min(location.x + 24, VIEWBOX_WIDTH - 8);
            const labelY = Math.min(Math.max(location.y, 22), VIEWBOX_HEIGHT - 18);
            return (
              <g key={`label-${need.id}`} pointerEvents="none">
                <text
                  x={labelX}
                  y={labelY - 3}
                  textAnchor={labelOnLeft ? 'end' : 'start'}
                  className="fill-stone-800 text-[11px] font-semibold"
                >
                  {shortTitle(need.title)}
                </text>
                <text
                  x={labelX}
                  y={labelY + 11}
                  textAnchor={labelOnLeft ? 'end' : 'start'}
                  className="fill-stone-600 text-[9px]"
                >
                  {need.stillNeeded} still needed
                </text>
              </g>
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
      <div className="grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
        {neighborhoodSupply.map((area) => (
          <div key={`legend-${area.name}`} className="flex items-start gap-2 rounded border border-stone-200 bg-white px-2.5 py-2">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${area.activeMemberCount < 2 ? 'bg-rose-700' : 'bg-stone-500'}`} />
            <span>
              <strong className="text-stone-800">{area.name}</strong>
              {' — '}
              {area.activeMemberCount > 0
                ? `${area.activeMemberCount} active members · ${area.distinctCapabilityCount} distinct capabilities`
                : `no members on record in ${area.name} — capability is registered town-wide only`}
            </span>
          </div>
        ))}
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
