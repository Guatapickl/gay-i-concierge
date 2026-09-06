import type { Metadata } from 'next';
export const metadata: Metadata = {"title": "Choose a new password", "description": "Set a new password for your Gay I Club account.", "alternates": {"canonical": "https://gayiclub.com/auth/reset"}, "robots": {"index": false, "follow": false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
