'use client';
import {useCallback,useEffect,useRef} from 'react';
import {onUserChange} from '@/lib/firebase/authClient';
import {createFeedbackEmailSync} from '@/lib/feedback-identity';
import Script from 'next/script';
import { feedbackConfig } from '@/lib/feedback-config';
export default function FeedbackWidget({hidden=false}:{hidden?:boolean}) {
  const identity=useRef(createFeedbackEmailSync());
  const observeHost=useRef<() => void>(()=>{});
  useEffect(()=>{
    let shadow: ShadowRoot | null=null;
    let signedIn=false;
    const sync=()=>{
      const input=shadow?.querySelector<HTMLInputElement>('#pxfb-email');
      if(input)identity.current.apply(input);
      const label=shadow?.querySelector('label[for="pxfb-email"]');
      const text=signedIn?'Reply email (optional — filled from your GayIClub account)':'Reply email (optional)';
      if(label && label.textContent!==text)label.textContent=text;
    };
    const changes=new MutationObserver(sync);
    const attach=()=>{
      const next=document.getElementById('praxis-feedback-host')?.shadowRoot ?? null;
      if(next!==shadow){
        changes.disconnect();shadow=next;
        if(shadow)changes.observe(shadow,{childList:true,subtree:true});
      }
      sync();
    };
    observeHost.current=attach;
    const hosts=new MutationObserver(attach);
    hosts.observe(document.body,{childList:true});
    const unsubscribe=onUserChange(user=>{
      signedIn=Boolean(user?.email);
      identity.current.setAccount(user?.email ?? null);
      // Do not retain another account's reply address on a shared device.
      try{localStorage.removeItem('pxfb.email');}catch{}
      attach();
    });
    attach();
    return ()=>{unsubscribe();changes.disconnect();hosts.disconnect();observeHost.current=()=>{};};
  },[]);
  const configure=useCallback(()=>{
    observeHost.current();
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
