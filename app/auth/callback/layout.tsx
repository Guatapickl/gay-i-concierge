import type { Metadata } from 'next';
export const metadata: Metadata = {"title": "Complete sign-in", "description": "Complete your Gay I Club account sign-in.", "alternates": {"canonical": "https://gayiclub.com/auth/callback"}, "robots": {"index": false, "follow": false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
