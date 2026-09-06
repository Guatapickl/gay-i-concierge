import type { Metadata } from 'next';
export const metadata: Metadata = {"title": "Reset your password", "description": "Request a password reset for your Gay I Club account.", "alternates": {"canonical": "https://gayiclub.com/auth/forgot"}, "robots": {"index": false, "follow": false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
