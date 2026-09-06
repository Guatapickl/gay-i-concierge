import type { Metadata } from 'next';
export const metadata: Metadata = {title:"AI news",description:"The club\u2019s curated AI news digest.",alternates:{canonical:'https://gayiclub.com/news'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return children;}
