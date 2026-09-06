import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Community feed",description:"Updates and conversations shared by club members.",alternates:{canonical:'https://gayiclub.com/feed'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
