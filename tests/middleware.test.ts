import {describe,it,expect} from 'vitest';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
describe('public launch assets',()=>{
 it('keeps the sign-in redirect on the public Firebase host',()=>{
  const r=middleware(new NextRequest('http://localhost:8080/events?from=home',{headers:{'x-forwarded-host':'gayiclub.com'}}));
  expect(r.headers.get('location')).toBe('https://gayiclub.com/auth/sign-in?from=home');
 });
 it('does not redirect to an unrecognized forwarded host',()=>{
  const r=middleware(new NextRequest('https://gayiclub.com/events',{headers:{'x-forwarded-host':'attacker.example'}}));
  expect(r.headers.get('location')).toBe('https://gayiclub.com/auth/sign-in');
 });
 it('redirects forwarded www traffic to the canonical host preserving path/query',()=>{
  const r=middleware(new NextRequest('http://localhost:8080/news?q=ai',{headers:{'x-forwarded-host':'www.gayiclub.com'}}));
  expect(r.status).toBe(308);expect(r.headers.get('location')).toBe('https://gayiclub.com/news?q=ai');
 });
 it('uses the original host forwarded by Firebase App Hosting',()=>{
  expect(middleware(new NextRequest('http://localhost:8080/',{headers:{host:'localhost:8080','x-forwarded-host':'gayiclub.com'}})).headers.get('x-robots-tag')).toBeNull();
  expect(middleware(new NextRequest('http://localhost:8080/',{headers:{host:'localhost:8080','x-forwarded-host':'gayiclub-web--gayiclub.us-east4.hosted.app'}})).headers.get('x-robots-tag')).toBe('noindex, nofollow');
 });
 it('allows the canonical Host behind a local reverse proxy',()=>{
  expect(middleware(new NextRequest('http://localhost:3107/',{headers:{host:'gayiclub.com'}})).headers.get('x-robots-tag')).toBeNull();
 });
 it('serves robots.txt without the robot member-route redirect',()=>{
  const response=middleware(new NextRequest('https://gayiclub.com/robots.txt'));
  expect(response.headers.get('location')).toBeNull();
 });
 it('still protects the robot page and its children',()=>{
  expect(middleware(new NextRequest('https://gayiclub.com/robot')).headers.get('location')).toContain('/auth/sign-in');
 });
 it('marks preview responses noindex while allowing the real domain to be indexed',()=>{
  expect(middleware(new NextRequest('http://localhost:3107/')).headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(middleware(new NextRequest('https://gayiclub.com/')).headers.get('x-robots-tag')).toBeNull();
 });
});

it('redirects signed-out directory and member-detail requests to sign-in', () => {
 for (const path of ['/community', '/community/member-id']) {
  expect(middleware(new NextRequest(`https://gayiclub.com${path}`)).headers.get('location')).toBe('https://gayiclub.com/auth/sign-in');
 }
});
