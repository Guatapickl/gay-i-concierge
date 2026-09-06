import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Agenda maker",description:"Plan and export your club meeting agenda.",alternates:{canonical:'https://gayiclub.com/agenda'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
