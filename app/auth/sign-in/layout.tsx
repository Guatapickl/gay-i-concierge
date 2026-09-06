import type { Metadata } from 'next';
export const metadata: Metadata = {"title": "Sign in", "description": "Sign in to Gay I Club with email or Google.", "alternates": {"canonical": "https://gayiclub.com/auth/sign-in"}, "robots": {"index": false, "follow": false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
