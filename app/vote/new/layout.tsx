import type { Metadata } from 'next';
export const metadata: Metadata = {"title": "Create a date poll", "description": "Suggest meeting dates for the club to vote on.", "alternates": {"canonical": "https://gayiclub.com/vote/new"}, "robots": {"index": false, "follow": false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
