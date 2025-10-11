"use client";

import { useEffect, useState } from 'react';

export default function AlertsUnsubConfirmPage() {
  const [status, setStatus] = useState<'pending'|'ok'|'error'>('pending');
  const [message, setMessage] = useState('Confirming…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Missing token'); return; }
    (async () => {
      try {
        const res = await fetch(`/api/alerts/unsubscribe/confirm?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) { setStatus('error'); setMessage(data?.error || 'Confirmation failed.'); }
        else { setStatus('ok'); setMessage('✅ You have been unsubscribed.'); }
      } catch {
        setStatus('error'); setMessage('Confirmation failed.');
      }
    })();
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Confirm Unsubscribe</h2>
      <div className={status === 'ok' ? 'text-green-700' : status === 'error' ? 'text-red-700' : ''}>{message}</div>
    </div>
  );
}

