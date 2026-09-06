import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://vibeshiftai.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' " + (process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === '1' ? 'http://127.0.0.1:9099 http://127.0.0.1:8080 ' : '') + "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://vibeshiftai.com",
  "frame-src https://gayiclub.firebaseapp.com https://accounts.google.com",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: /.*/,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains; preload'},
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(self), geolocation=(), payment=()'},
      {key:'Content-Security-Policy',value:csp},
    ]}];
  },
  async redirects() {
    return [{source:'/:path*',has:[{type:'host',value:'www.gayiclub.com'}],destination:'https://gayiclub.com/:path*',permanent:true}];
  },
};
export default nextConfig;
