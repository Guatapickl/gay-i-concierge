import {beforeEach,describe,it,expect,vi} from 'vitest';
const create = vi.hoisted(()=>vi.fn());
const set = vi.hoisted(()=>vi.fn());
const ensure = vi.hoisted(()=>vi.fn());
vi.mock('next/headers',()=>({cookies:async()=>({set,delete:vi.fn()})}));
vi.mock('@/lib/firebase/session',()=>({createSessionCookie:create,SESSION_COOKIE:'__session'}));
vi.mock('@/lib/firebase/userProfiles',()=>({ensureProfileForIdToken:ensure}));
import {POST} from '@/app/api/auth/session/route';
beforeEach(()=>{vi.clearAllMocks();create.mockResolvedValue('server-cookie');ensure.mockResolvedValue({created:false,profile:null})});
describe('session origin guard',()=>{
 it('rejects attacker origin even with an attacker forwarded host',async()=>{
  const r=await POST(new Request('http://localhost:8080/api/auth/session',{method:'POST',headers:{Origin:'https://attacker.example','x-forwarded-host':'attacker.example','Content-Type':'application/json'},body:JSON.stringify({idToken:'attacker-token'})}));
  expect(r.status).toBe(403);expect(create).not.toHaveBeenCalled();expect(ensure).not.toHaveBeenCalled();
 });
 it('accepts the public origin forwarded by Firebase App Hosting',async()=>{
  const r=await POST(new Request('http://localhost:8080/api/auth/session',{method:'POST',headers:{Origin:'https://gayiclub.com','x-forwarded-host':'gayiclub.com','x-forwarded-proto':'https','Content-Type':'application/json'},body:JSON.stringify({idToken:'valid-token'})}));
  expect(r.status).toBe(200);expect(set).toHaveBeenCalled();
 });
 it('rejects a cross-origin login before minting a session',async()=>{
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'text/plain'},body:JSON.stringify({idToken:'attacker-token'})}));
  expect(r.status).toBe(403);expect(create).not.toHaveBeenCalled();
 });
 it('accepts the same-origin member sign-in',async()=>{
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://gayiclub.com','Content-Type':'application/json'},body:JSON.stringify({idToken:'valid-token'})}));
  expect(r.status).toBe(200);expect(set).toHaveBeenCalled();
 });
 it('creates the basic member profile once the session is minted',async()=>{
  ensure.mockResolvedValue({created:true,profile:{id:'new-member',full_name:null}});
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://gayiclub.com','Content-Type':'application/json'},body:JSON.stringify({idToken:'valid-token'})}));
  expect(r.status).toBe(200);expect(ensure).toHaveBeenCalledWith('valid-token');
  expect(set.mock.invocationCallOrder[0]).toBeLessThan(ensure.mock.invocationCallOrder[0]);
 });
 it('still signs the member in when the profile write fails',async()=>{
  ensure.mockRejectedValue(new Error('firestore unavailable'));
  const error=vi.spyOn(console,'error').mockImplementation(()=>{});
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://gayiclub.com','Content-Type':'application/json'},body:JSON.stringify({idToken:'valid-token'})}));
  expect(r.status).toBe(200);expect(set).toHaveBeenCalled();expect(error).toHaveBeenCalledWith('user profile create failed:','firestore unavailable');
  error.mockRestore();
 });
 it('creates no profile when the token is rejected',async()=>{
  create.mockRejectedValue(new Error('invalid id token'));
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://gayiclub.com','Content-Type':'application/json'},body:JSON.stringify({idToken:'forged'})}));
  expect(r.status).toBe(401);expect(ensure).not.toHaveBeenCalled();expect(set).not.toHaveBeenCalled();
 });
});
