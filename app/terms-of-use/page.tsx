import type { Metadata } from 'next';
import { baseHtml } from '@/lib/legal/terms-of-use';
export const metadata: Metadata = {title:'Terms of Use',description:'Terms and community expectations for Gay I Club.',alternates:{canonical:'https://gayiclub.com/terms-of-use'}};
export default function Terms() {
 return <article className="legal-page"><p className="eyebrow">VibeShift AI · Effective 2026-09-06</p><h1>Terms of Use</h1><p>Gay I Club is a VibeShift AI project. The following base terms describe VibeShift AI&apos;s website and project requests. The community addendum below applies to Gay I Club.</p><div dangerouslySetInnerHTML={{__html:baseHtml}}/>
 <h2>Gay I Club community addendum</h2><p>Gay I Club is a community for adults aged 18 and over. Be respectful, protect other members&apos; privacy, and share only content you have the right to share. Harassment, discrimination, threats, spam, impersonation, and posting private information without consent are not allowed.</p>
 <p>You retain ownership of content you contribute. By posting, you give VibeShift AI permission to store and display that content to provide the club features you use. Organizers may moderate content or restrict access when necessary to protect the community. Report concerns to <a href="mailto:praxis+gayiclub@vibeshiftai.com">praxis+gayiclub@vibeshiftai.com</a>.</p>
 <p>Event details and availability can change; confirm arrangements with the organizer. AI replies, summaries, generated code and benchmark outputs can be inaccurate. Review them before relying on or using them. AI output is not professional advice.</p>
 <p>Do not attempt to access other accounts, extract private member information, bypass access controls, or disrupt the service. Keep your sign-in credentials private. Please contact support if you suspect unauthorized account access.</p>
 </article>;
}
