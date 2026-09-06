'use client';
import {useCallback,useEffect} from 'react';
import Script from 'next/script';
import { feedbackConfig } from '@/lib/feedback-config';
export default function FeedbackWidget({hidden=false}:{hidden?:boolean}) {
  const configure=useCallback(()=>{
    const host=document.getElementById('praxis-feedback-host');
    if(!host)return;
    host.style.visibility=hidden?'hidden':'';
    host.inert=hidden;
    const shadow=host.shadowRoot;
    if(shadow&&!shadow.querySelector('[data-club-position]')){
      const style=document.createElement('style');style.dataset.clubPosition='true';
      style.textContent='@media(max-width:800px){.launcher{bottom:86px}}';shadow.appendChild(style);
    }
  },[hidden]);
  useEffect(configure,[configure]);
  return <Script src="https://vibeshiftai.com/feedback/widget.js?v=3" strategy="lazyOnload" onReady={configure} data-project={feedbackConfig.project} data-token={feedbackConfig.token} data-relay={feedbackConfig.relay} data-position="bottom-left" data-accent="#206e75" data-label="Send feedback" />;
}
