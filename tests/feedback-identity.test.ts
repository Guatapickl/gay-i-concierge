import {describe,it,expect} from 'vitest';
import {createFeedbackEmailSync} from '../lib/feedback-identity';

function field(value='') {
  const input={value, events:0, dispatchEvent(){input.events++;return true;}};
  return input as unknown as HTMLInputElement & {events:number};
}
describe('feedback account email',()=>{
  it('fills a new widget field and tells the widget about the change',()=>{
    const sync=createFeedbackEmailSync();sync.setAccount('member@example.test');
    const input=field();sync.apply(input);expect(input.value).toBe('member@example.test');expect(input.events).toBe(1);
  });
  it('keeps an edited reply address during unrelated widget mutations',()=>{
    const sync=createFeedbackEmailSync();sync.setAccount('member@example.test');
    const input=field();sync.apply(input);input.value='reply@example.test';sync.apply(input);expect(input.value).toBe('reply@example.test');
  });
  it('clears the previous account on signout and updates on account switch',()=>{
    const sync=createFeedbackEmailSync();const input=field('old@example.test');
    sync.setAccount('first@example.test');sync.apply(input);
    sync.setAccount(null);sync.apply(input);expect(input.value).toBe('');
    sync.setAccount('second@example.test');sync.apply(input);expect(input.value).toBe('second@example.test');
  });
  it('does not erase guest typing on repeated updates and clears stale remembered email',()=>{
    const sync=createFeedbackEmailSync();sync.setAccount(null);const input=field('old@example.test');
    sync.apply(input);expect(input.value).toBe('');input.value='guest@example.test';sync.apply(input);expect(input.value).toBe('guest@example.test');
  });
  it('waits for restored auth and fills newly rendered compose fields',()=>{
    const sync=createFeedbackEmailSync();const input=field('remembered');sync.apply(input);expect(input.value).toBe('remembered');
    sync.setAccount('member@example.test');sync.apply(input);const recreated=field();sync.apply(recreated);expect(recreated.value).toBe('member@example.test');
  });
});
