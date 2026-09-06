import { ImageResponse } from 'next/og';
export const alt = 'Gay I Club — Gay people exploring the AI frontier in NYC';
export const size = { width:1200, height:630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#0a0b0d',color:'#f2f4f6',padding:'64px 72px',fontFamily:'sans-serif'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:26}}><span>Gay I Club</span><span style={{color:'#a9afb8',fontSize:20}}>NYC · EST. 2024</span></div><div style={{display:'flex',flexDirection:'column'}}><div style={{color:'#7fd8e0',fontSize:20,letterSpacing:3,marginBottom:24}}>GAY PEOPLE EXPLORING THE AI FRONTIER</div><div style={{display:'flex',flexDirection:'column',fontSize:78,letterSpacing:-3,lineHeight:1.08}}><span>New York City&apos;s</span><span>home for Gay AI</span></div></div><div style={{display:'flex',borderTop:'1px solid #252930',paddingTop:24,color:'#a9afb8',fontSize:20}}>gayiclub.com · a VibeShift AI project</div></div>,size);
}
