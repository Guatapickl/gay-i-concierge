import { describe, expect, it } from 'vitest';
import { buildPollReport, buildTieQuestion, type PollReportInput } from '../lib/poll-report';

const base: PollReportInput = {
  pollId: 'september', title: 'September meeting', deadline: 'September 13, 2026 at 6 PM ET',
  respondents: 3, totalMembers: 5, outcome: 'scheduled',
  rows: [
    { optionId: 'a', label: 'September 19', points: 5, available: 2, unavailable: 1, unanswered: 0, firstChoice: 2, avgRank: 1 },
    { optionId: 'b', label: 'September 26', points: 2, available: 1, unavailable: 1, unanswered: 1, firstChoice: 0, avgRank: 2 },
  ],
};

describe('buildPollReport', () => {
  it('reports explicit unavailability separately from unanswered dates and member nonresponses', () => {
    const report = buildPollReport(base);
    expect(report.text).toContain('Responses: 3 of 5 members; 2 did not respond.');
    expect(report.text).toContain('September 26: 2 points; 1 available; 1 can\'t make this date; 1 unanswered; 0 first-choice; average rank 2.00');
    expect(report.html).toContain('Can&#039;t make this date');
    expect(report.text).toContain('With 2 original options, rank 1 earns 2 points');
    expect(report.text).toContain('Unavailable and unanswered dates earn zero points.');
  });
  it('includes booking details and the owner poll link', () => {
    const report = buildPollReport({ ...base, eventUrl: 'https://gayiclub.com/events/meeting-september', eventWhen: 'September 19 at 3 PM ET', location: 'Community room' });
    expect(report.text).toContain('Meeting booked');
    expect(report.text).toContain('September 19 at 3 PM ET');
    expect(report.text).toContain('Location: Community room');
    expect(report.html).toContain('href="https://gayiclub.com/events/meeting-september"');
    expect(report.text).toContain('https://gayiclub.com/vote/september');
  });
  it.each([
    ['no_responses', 'No members responded'],
    ['no_available_dates', 'No future date has any available responses'],
    ['needs_schedule', 'Meeting time or location needs your decision'],
    ['past_dates', 'The candidate dates have passed'],
  ] as const)('explains %s without inventing a booking', (outcome, message) => {
    const report = buildPollReport({ ...base, outcome });
    expect(report.text).toContain(message);
    expect(report.text).toContain('No meeting has been booked.');
  });
  it('shows all-unavailable ballots as responses without awarding points', () => {
    const report = buildPollReport({ ...base, outcome: 'no_available_dates', respondents: 3, rows: base.rows.map(row => ({ ...row, points: 0, available: 0, unavailable: 3, unanswered: 0, firstChoice: 0, avgRank: null })) });
    expect(report.text).toContain('Responses: 3 of 5 members; 2 did not respond.');
    expect(report.text).toContain("0 points; 0 available; 3 can't make this date; 0 unanswered; 0 first-choice; average rank —");
    expect(report.text).toContain('No meeting has been booked.');
  });
  it('reports zero respondents without converting nonresponses into explicit unavailability', () => {
    const report = buildPollReport({ ...base, outcome: 'no_responses', respondents: 0, rows: base.rows.map(row => ({ ...row, points: 0, available: 0, unavailable: 0, unanswered: 0, firstChoice: 0, avgRank: null })) });
    expect(report.text).toContain('Responses: 0 of 5 members; 5 did not respond.');
    expect(report.text).toContain("0 available; 0 can't make this date; 0 unanswered");
  });
  it('shows tied options and requests an owner decision', () => {
    const report = buildPollReport({ ...base, outcome: 'awaiting_tie_break', tiedOptionIds: ['a', 'b'] });
    expect(report.text).toContain('Tied dates: September 19; September 26.');
    expect(report.text).toContain('Choose the winning date in your Praxis questionnaire or on the poll page.');
    expect(report.text).toContain('No meeting has been booked.');
    expect(report.text).toContain('Ties are decided by Robert, never by the earliest date or first-choice count.');
  });
  it('escapes hostile display values and encodes the poll ID', () => {
    const report = buildPollReport({ ...base, pollId: 'x"/<script>', title: '<script>alert("x")</script>\r\nBcc: evil', rows: [{ ...base.rows[0], label: '<img src=x onerror="x">' }], eventWhen: '<b>today</b>', location: '<iframe>' });
    expect(report.html).not.toContain('<script>');
    expect(report.html).not.toContain('<img');
    expect(report.html).toContain('&lt;img src=x onerror=&quot;x&quot;&gt;');
    expect(report.html).toContain('https://gayiclub.com/vote/x%22%2F%3Cscript%3E');
    expect(report.subject).not.toMatch(/[\r\n]/);
  });
  it.each(['javascript:alert(1)', 'https://evil.example/events/x', 'https://gayiclub.com@evil.example/events/x', 'https://gayiclub.com/events/x?redirect=evil', 'https://gayiclub.com/events/x#evil'])('omits unsafe event URL %s', eventUrl => {
    const report = buildPollReport({ ...base, eventUrl });
    expect(report.html).not.toContain(eventUrl);
    expect(report.text).not.toContain('View event:');
  });
});

describe('buildTieQuestion', () => {
  it('builds the existing Praxis choice request using only supplied tied rows', () => {
    const request = buildTieQuestion({ pollId: 'september', title: 'September meeting', rows: base.rows, reportText: 'Poll report', expiresAt: '2026-09-18T22:00:00Z' });
    expect(request).toMatchObject({ id: 'tie-september', recipientName: 'Robert', expiresAt: '2026-09-18T22:00:00Z', questions: [{ id: 'winning_date', kind: 'choice', options: ['September 19', 'September 26'], required: true }] });
    expect(request.body).toContain('Poll report');
    expect(request.body).toContain('Choose one tied date');
  });
  it('rejects ambiguous duplicate labels and fewer than two choices', () => {
    const input = { pollId: 'p', title: 'Title', reportText: '', expiresAt: '2026-09-18T22:00:00Z' };
    expect(() => buildTieQuestion({ ...input, rows: [base.rows[0], { ...base.rows[1], label: base.rows[0].label }] })).toThrow(/unique/i);
    expect(() => buildTieQuestion({ ...input, rows: [base.rows[0]] })).toThrow(/two/i);
  });
});
