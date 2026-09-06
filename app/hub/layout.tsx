import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Club hub",description:"Your Gay I Club communication workspace.",alternates:{canonical:'https://gayiclub.com/hub'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
