import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Events",description:"Upcoming Gay I Club gatherings and member RSVPs.",alternates:{canonical:'https://gayiclub.com/events'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
