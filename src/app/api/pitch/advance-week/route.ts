import { NextResponse } from 'next/server';
import { resolveWeek } from '../logic';
import { write } from '@/lib/store';

export async function POST() {
  const summary = write((data) => resolveWeek(data));
  return NextResponse.json(summary);
}
