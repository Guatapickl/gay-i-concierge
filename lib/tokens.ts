export function generateToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function expiresIn(hours: number): string {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

