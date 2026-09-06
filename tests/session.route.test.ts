import {beforeEach,describe,it,expect,vi} from 'vitest';
const create = vi.hoisted(()=>vi.fn());
const set = vi.hoisted(()=>vi.fn());
vi.mock('next/headers',()=>({cookies:async()=>({set,delete:vi.fn()})}));
vi.mock('@/lib/firebase/session',()=>({createSessionCookie:create,SESSION_COOKIE:'__session'}));
import {POST} from '@/app/api/auth/session/route';
beforeEach(()=>{vi.clearAllMocks();create.mockResolvedValue('server-cookie')});
describe('session origin guard',()=>{
 it('rejects a cross-origin login before minting a session',async()=>{
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'text/plain'},body:JSON.stringify({idToken:'attacker-token'})}));
  expect(r.status).toBe(403);expect(create).not.toHaveBeenCalled();
 });
 it('accepts the same-origin member sign-in',async()=>{
  const r=await POST(new Request('https://gayiclub.com/api/auth/session',{method:'POST',headers:{Origin:'https://gayiclub.com','Content-Type':'application/json'},body:JSON.stringify({idToken:'valid-token'})}));
  expect(r.status).toBe(200);expect(set).toHaveBeenCalled();
 });
});
