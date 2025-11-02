// api/index.js
export default async function handler(request) {
  return new Response(JSON.stringify({ message: 'Fielsdown API' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
