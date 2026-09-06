import {describe,it,expect} from 'vitest';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
describe('public launch assets',()=>{
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
