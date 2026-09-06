import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Meeting calendar",description:"Browse Gay I Club meetings and calendar exports.",alternates:{canonical:'https://gayiclub.com/calendar'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
