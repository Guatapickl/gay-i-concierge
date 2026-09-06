import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Email updates",description:"Manage optional club email updates.",alternates:{canonical:'https://gayiclub.com/alerts'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
