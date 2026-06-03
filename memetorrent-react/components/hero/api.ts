export async function getTokenStats() {
  const res = await fetch(
    'https://futuret3ch.pythonanywhere.com/api/token-data',
    { cache: 'no-store' }
  );

  if (!res.ok) throw new Error('Token API failed');
  return res.json();
}
