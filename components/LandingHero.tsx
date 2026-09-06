import Link from 'next/link';

const features = [
  ['01', 'Communication Hub', 'Discussions across channels — model releases, paper club, off-topic, NYC-specific.'],
  ['02', 'Meeting Calendar', 'Recurring meetups with reminders, agendas, RSVPs, and one-tap calendar export.'],
  ['03', 'News Feed', 'An AI-summarized digest of the most relevant releases, papers, and policy moves.'],
];

export default function LandingHero() {
  return <div className="landing">
    <section className="landing-hero">
      <p className="eyebrow flex items-center gap-3"><span className="status-dot" />Gay people exploring the AI frontier</p>
      <h1>New York City&apos;s home for Gay AI</h1>
      <p className="landing-description">Monthly meetups to chat about the latest AI news and our latest builds.</p>
      <div className="landing-actions flex flex-wrap gap-3.5">
        <Link href="/auth/sign-up" className="btn-primary">Join the club</Link>
        <Link href="/events" className="btn-secondary">Browse events</Link>
      </div>
    </section>
    <section className="landing-features" aria-label="Explore the club">
      {features.map(([num, title, description]) => <article key={num}>
        <p className="eyebrow">{num}</p><h2>{title}</h2><p>{description}</p>
      </article>)}
    </section>
  </div>;
}
