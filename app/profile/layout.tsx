import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Your profile",description:"Manage your member profile, interests, communication preferences and account.",alternates:{canonical:'https://gayiclub.com/profile'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
