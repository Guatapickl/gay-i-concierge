import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Robot benchmark",description:"Compare SVG robot outputs from AI models.",alternates:{canonical:'https://gayiclub.com/robot'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
