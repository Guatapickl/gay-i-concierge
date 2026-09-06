import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Meeting date votes",description:"Rank proposed club meeting dates.",alternates:{canonical:'https://gayiclub.com/vote'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
