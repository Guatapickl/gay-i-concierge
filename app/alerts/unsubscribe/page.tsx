'use client';
import {useState} from 'react';
import {Button,FormInput} from '@/components/ui';
export default function Unsubscribe() {
 const [email,setEmail]=useState('');const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');
 async function submit(e:React.FormEvent){
  e.preventDefault();setLoading(true);setMessage('');
  try{const r=await fetch('/api/alerts/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),channels:['email']})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not request unsubscribe.');setMessage('Check your email for a link to confirm your unsubscribe request.');}
  catch(error){setMessage(error instanceof Error?error.message:'Please try again.');}finally{setLoading(false);}
 }
 return <div className="max-w-md mx-auto card p-6"><p className="eyebrow mb-3">Email preferences</p><h1 className="page-heading mb-4">Unsubscribe</h1><p className="text-sm text-foreground-muted mb-6">Enter your email and confirm the link we send to stop club email updates. SMS delivery is not offered.</p><form onSubmit={submit} className="space-y-4"><FormInput label="Email address" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/><Button type="submit" disabled={loading}>{loading?'Requesting…':'Send confirmation link'}</Button>{message&&<p role="status" className="text-sm">{message}</p>}</form></div>;
}
