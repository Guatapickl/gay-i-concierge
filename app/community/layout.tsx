import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Member directory",description:"Find and connect with Gay I Club members.",alternates:{canonical:'https://gayiclub.com/community'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
