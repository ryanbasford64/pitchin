import { reseed } from '@/lib/store';
import { revalidatePath } from 'next/cache';

export async function POST() {
  const data = reseed();
  revalidatePath('/readiness');
  revalidatePath('/print');
  revalidatePath('/surge');
  return Response.json({ ok: true, weekOf: data.weekOf });
}
