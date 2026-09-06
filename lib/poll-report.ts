/** Pure owner-report formatting. Counts and booking decisions come from the poll engine. */
export interface PollReportRow {
  optionId: string;
  label: string;
  points: number;
  available: number;
  unavailable: number;
  unanswered: number;
  firstChoice: number;
  avgRank: number | null;
}

export interface PollReportInput {
  pollId: string;
  title: string;
  rows: PollReportRow[];
  respondents: number;
  totalMembers: number;
  outcome: 'scheduled' | 'awaiting_tie_break' | 'needs_schedule' | 'no_responses' | 'no_available_dates' | 'past_dates';
  eventUrl?: string;
  eventWhen?: string;
  location?: string;
  deadline: string;
  tiedOptionIds?: string[];
}

const ORIGIN = 'https://gayiclub.com';
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const subjectLine = (value: string) => value.replace(/[\r\n]+/g, ' ');
const averageRank = (row: PollReportRow) => row.avgRank === null || !Number.isFinite(row.avgRank) ? '—' : row.avgRank.toFixed(2);

function ownEventUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.origin === ORIGIN && !url.username && !url.password && !url.search && !url.hash && /^\/events\/[^/]+$/.test(url.pathname)) return url.href;
  } catch { /* Invalid URLs are omitted from both report formats. */ }
  return undefined;
}

function outcomeDescription(input: PollReportInput): string {
  switch (input.outcome) {
    case 'scheduled': return `Meeting booked${input.eventWhen ? `: ${input.eventWhen}` : '.'}`;
    case 'awaiting_tie_break': return 'The highest eligible points total is tied. No meeting has been booked. Choose the winning date in your Praxis questionnaire or on the poll page.';
    case 'needs_schedule': return 'Meeting time or location needs your decision. No meeting has been booked.';
    case 'no_responses': return 'No members responded. No meeting has been booked.';
    case 'no_available_dates': return 'No future date has any available responses. No meeting has been booked.';
    case 'past_dates': return 'The candidate dates have passed. No meeting has been booked.';
    default: throw new Error('Unknown poll outcome');
  }
}

export function buildPollReport(input: PollReportInput): { subject: string; html: string; text: string } {
  const subject = subjectLine(`Poll results: ${input.title}`);
  const ownerUrl = `${ORIGIN}/vote/${encodeURIComponent(input.pollId)}`;
  const eventUrl = input.outcome === 'scheduled' ? ownEventUrl(input.eventUrl) : undefined;
  const outcome = outcomeDescription(input);
  const responses = `Responses: ${input.respondents} of ${input.totalMembers} members; ${Math.max(0, input.totalMembers - input.respondents)} did not respond.`;
  const scoring = `With ${input.rows.length} original options, rank 1 earns ${input.rows.length} points, rank 2 earns ${Math.max(0, input.rows.length - 1)} points, and so on (N − rank + 1). Unavailable and unanswered dates earn zero points. Ties are decided by Robert, never by the earliest date or first-choice count.`;
  const unanswered = 'Unanswered counts are among respondents only; they are separate from members who did not respond. Available counts include everyone who ranked that date.';
  const tied = input.outcome === 'awaiting_tie_break'
    ? input.rows.filter(row => input.tiedOptionIds?.includes(row.optionId)).map(row => row.label)
    : [];
  const tiedText = tied.length ? `Tied dates: ${tied.join('; ')}.` : '';
  const text = [input.title, `Voting deadline: ${input.deadline}`, '', outcome,
    ...(input.outcome === 'scheduled' && input.location ? [`Location: ${input.location}`] : []),
    ...(tiedText ? [tiedText] : []), '', responses, '',
    ...input.rows.map(row => `${row.label}: ${row.points} points; ${row.available} available; ${row.unavailable} can't make this date; ${row.unanswered} unanswered; ${row.firstChoice} first-choice; average rank ${averageRank(row)}`),
    '', unanswered, scoring, '', `Review poll: ${ownerUrl}`, ...(eventUrl ? [`View event: ${eventUrl}`] : []),
  ].join('\n');
  const cellStyle = 'padding:9px 6px;border-bottom:1px solid #393939;text-align:left;vertical-align:top;';
  const header = ['Date', 'Points', 'Available', "Can't make this date", 'Unanswered', 'First choice', 'Avg. rank'];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#0a0a0a;color:#ededed;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
<div style="max-width:760px;margin:auto;padding:24px;background:#141414;border:1px solid #393939;border-radius:12px;">
<a href="${ORIGIN}" style="color:#ff6b9d;font-size:18px;font-weight:bold;">Gay I Club</a>
<h1 style="font-size:24px;">${escapeHtml(input.title)}</h1>
<p>Voting deadline: ${escapeHtml(input.deadline)}</p>
<p><strong>${escapeHtml(outcome)}</strong></p>
${input.outcome === 'scheduled' && input.location ? `<p>Location: ${escapeHtml(input.location)}</p>` : ''}
${tiedText ? `<p>${escapeHtml(tiedText)}</p>` : ''}
<p>${escapeHtml(responses)}</p>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
<caption style="text-align:left;font-size:18px;font-weight:bold;padding:8px 0;">Results by date</caption>
<thead><tr>${header.map(label => `<th scope="col" style="${cellStyle}">${escapeHtml(label)}</th>`).join('')}</tr></thead>
<tbody>${input.rows.map(row => `<tr><th scope="row" style="${cellStyle}">${escapeHtml(row.label)}</th>${[row.points, row.available, row.unavailable, row.unanswered, row.firstChoice, averageRank(row)].map(value => `<td style="${cellStyle}">${escapeHtml(String(value))}</td>`).join('')}</tr>`).join('')}</tbody></table>
<p style="color:#b8b8b8;font-size:13px;">${escapeHtml(unanswered)}</p>
<p style="color:#b8b8b8;font-size:13px;">${escapeHtml(scoring)}</p>
<p><a href="${escapeHtml(ownerUrl)}" style="color:#ff6b9d;">Review poll</a>${eventUrl ? ` &nbsp; <a href="${escapeHtml(eventUrl)}" style="color:#ff6b9d;">View event</a>` : ''}</p>
<p style="color:#b8b8b8;font-size:12px;">Owner report for Robert.</p>
</div></body></html>`;
  return { subject, html, text };
}

/** Callers persist the option ID/label mapping and validate the selected label on callback. */
export function buildTieQuestion(input: {
  pollId: string;
  title: string;
  rows: Pick<PollReportRow, 'optionId' | 'label'>[];
  reportText: string;
  expiresAt: string;
}) {
  const options = input.rows.map(row => row.label);
  if (options.length < 2) throw new Error('A tie requires at least two choices');
  if (new Set(options).size !== options.length || options.some(label => !label.trim())) throw new Error('Tie choice labels must be nonempty and unique');
  return {
    id: `tie-${input.pollId}`,
    subject: subjectLine(`GayIClub: choose the winning date for ${input.title}`),
    body: `${input.reportText}\n\nChoose one tied date below. Your choice will book the meeting using its configured time and location. No date is chosen automatically.`,
    recipientName: 'Robert',
    questions: [{ id: 'winning_date', kind: 'choice' as const, prompt: 'Which tied date should we book?', options, required: true }],
    expiresAt: input.expiresAt,
  };
}
