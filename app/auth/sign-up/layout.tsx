import type { Metadata } from 'next';
export const metadata: Metadata = {"title": "Create an account", "description": "Join the Gay I Club community.", "alternates": {"canonical": "https://gayiclub.com/auth/sign-up"}, "robots": {"index": false, "follow": false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
