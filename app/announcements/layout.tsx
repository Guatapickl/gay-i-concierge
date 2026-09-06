import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Announcements",description:"Updates from Gay I Club organizers.",alternates:{canonical:'https://gayiclub.com/announcements'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
