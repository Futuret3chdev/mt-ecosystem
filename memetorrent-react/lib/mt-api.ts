const MT_NODE = 'http://localhost:4000';

export async function getAccount(address: string) {
  const res = await fetch(`${MT_NODE}/account/${address}`);
  return res.json();
}
