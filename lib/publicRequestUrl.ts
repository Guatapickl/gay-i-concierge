// Firebase App Hosting terminates HTTPS and forwards the original public host.
// Only deployment-owned hosts may replace the internal request origin.
const PUBLIC_HOSTS = new Set([
  'gayiclub.com',
  'www.gayiclub.com',
  'gayiclub-web--gayiclub.us-east4.hosted.app',
]);

export function publicRequestUrl(request: Request): URL {
  const url = new URL(request.url);
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0].trim().toLowerCase();
  const host = request.headers.get('host')?.trim().toLowerCase();
  const publicHost = [forwarded, host].find(value => value && PUBLIC_HOSTS.has(value));
  if (publicHost) {
    url.port = '';
    url.hostname = publicHost;
    url.protocol = 'https:';
  }
  return url;
}
