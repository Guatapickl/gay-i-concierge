import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Resources",description:"AI guides, tools and learning materials shared by club members.",alternates:{canonical:'https://gayiclub.com/resources'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
