// api/public.js
export const config = { runtime: 'edge' };

export default async function handler() {
  const kv = process.env.VERCEL_KV;
  const boards = await kv.get('boards', { type: 'json' }) || [];
  
  return new Response(JSON.stringify(boards), {
    headers: { 'Content-Type': 'application/json' }
  });
}
