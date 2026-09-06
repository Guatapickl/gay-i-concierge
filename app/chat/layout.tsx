import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Communication hub",description:"Conversations across Gay I Club channels.",alternates:{canonical:'https://gayiclub.com/chat'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
