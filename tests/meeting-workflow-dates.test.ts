import { describe, it, expect } from 'vitest';
import { followingMonth, weekendDates, localDate, selectedDates, dateQuestionId } from '../lib/meeting-workflow-dates';
describe('owner availability dates', () => {
  it('uses New York meeting day and rolls December into the next year', () => {
    expect(localDate(new Date('2026-10-01T01:00:00Z'))).toBe('2026-09-30');
    expect(followingMonth('2026-12-31')).toBe('2027-01');
  });
  it('includes all and only next-month Saturdays and Sundays', () => {
    expect(weekendDates('2026-10')).toEqual(['2026-10-03','2026-10-04','2026-10-10','2026-10-11','2026-10-17','2026-10-18','2026-10-24','2026-10-25','2026-10-31']);
  });
  it('requires exact complete choices and never infers availability', () => {
    const dates = ['2026-10-03','2026-10-04'];
    expect(() => selectedDates(dates, {})).toThrow();
    expect(() => selectedDates(dates, { [dateQuestionId(dates[0])]: 'yes', [dateQuestionId(dates[1])]: 'Unavailable' })).toThrow();
    expect(selectedDates(dates, { [dateQuestionId(dates[0])]: 'Available', [dateQuestionId(dates[1])]: 'Unavailable' })).toEqual([dates[0]]);
    expect(selectedDates(dates, Object.fromEntries(dates.map(d => [dateQuestionId(d), 'Unavailable'])))).toEqual([]);
  });
});
