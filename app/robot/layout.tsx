import type { Metadata } from 'next';
export const metadata: Metadata = {title:"Flagship Showcase",description:"Explore original robot artwork, vote for your favorites, and sort by newest or top voted.",alternates:{canonical:'https://gayiclub.com/robot'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
