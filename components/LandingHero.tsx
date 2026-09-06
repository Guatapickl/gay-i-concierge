import Link from 'next/link';

const features = [
  ['01', 'Communication Hub', 'Discussions across channels about model releases, new research papers, personal projects, and sometimes NYC-specific topics'],
  ['02', 'Meeting Calendar', 'Member-polled meeting dates with reminders, agendas, RSVPs, and calendar export.'],
  ['03', 'News Feed', 'Daily AI news from trusted sources. Save stories, share links, and bring ideas to our next meeting.'],
];

export default function LandingHero() {
  return <div className="landing">
    <section className="landing-hero">
      <p className="eyebrow flex items-center gap-3"><span className="status-dot" />Gay people exploring the AI frontier</p>
      <h1>New York City&apos;s home for Gay AI</h1>
      <p className="landing-description">Monthly meetups to chat about the latest AI news and our latest builds.</p>
      <div className="landing-actions flex flex-wrap items-center gap-3.5">
        <Link href="/auth/sign-in" className="btn-primary">Sign in</Link>
        <Link href="/auth/sign-up" className="landing-sign-up">Sign up</Link>
      </div>
    </section>
    <section className="landing-features" aria-label="Explore the club">
      {features.map(([num, title, description]) => <article key={num}>
        <p className="eyebrow">{num}</p><h2>{title}</h2><p>{description}</p>
      </article>)}
    </section>
  </div>;
}
