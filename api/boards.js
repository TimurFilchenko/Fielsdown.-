// api/boards.js
export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Только POST' }), { status: 405 });
  }

  const kv = process.env.VERCEL_KV;
  const body = await request.json();
  const { name, description, creator } = body;

  if (!name || !creator) {
    return new Response(JSON.stringify({ error: 'Нужны name и creator' }), { status: 400 });
  }

  // Получаем текущие доски
  let boards = await kv.get('boards', { type: 'json' }) || [];

  // Проверка уникальности
  if (boards.some(b => b.name === name)) {
    return new Response(JSON.stringify({ error: 'Доска уже существует' }), { status: 409 });
  }

  // Создаём доску
  const newBoard = {
    id: Date.now(),
    name,
    description: description || '',
    creator,
    created_at: new Date().toISOString()
  };

  boards.push(newBoard);
  await kv.put('boards', JSON.stringify(boards));

  return new Response(JSON.stringify(newBoard), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
