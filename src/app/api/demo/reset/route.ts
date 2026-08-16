import { reseed } from '@/lib/store';

export async function POST() {
  const data = reseed();
  return Response.json({ ok: true, weekOf: data.weekOf });
}
