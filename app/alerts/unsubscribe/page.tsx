"use client";

import { useState } from 'react';

export default function AlertsUnsubscribePage() {
  const [emailChecked, setEmailChecked] = useState(true);
  const [smsChecked, setSmsChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!emailChecked && !smsChecked) {
      setMessage('Please select at least one channel to unsubscribe.');
      return;
    }
    if (emailChecked) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      if (!ok) { setMessage('Please enter the email you subscribed with.'); return; }
    }
    if (smsChecked) {
      const ok = /^\+?[1-9]\d{7,14}$/.test(phone.trim());
      if (!ok) { setMessage('Please enter the phone you subscribed with (E.164).'); return; }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/alerts/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailChecked ? email.trim() : undefined,
          phone: smsChecked ? phone.trim() : undefined,
          channels: [
            ...(emailChecked ? ['email'] as const : []),
            ...(smsChecked ? ['sms'] as const : []),
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Unsubscribe failed.');
      } else {
        setMessage('✅ You have been unsubscribed.');
        setEmail('');
        setPhone('');
      }
    } catch {
      setMessage('Unsubscribe failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Unsubscribe from Alerts</h2>
      <p className="mb-4 text-sm text-gray-600">Stop receiving alerts by email and/or SMS.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={emailChecked} onChange={e => setEmailChecked(e.target.checked)} />
            Email alerts
          </label>
          <input
            type="email"
            className="mt-2 w-full border px-3 py-2 rounded"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={!emailChecked}
          />
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={smsChecked} onChange={e => setSmsChecked(e.target.checked)} />
            SMS alerts
          </label>
          <input
            type="tel"
            className="mt-2 w-full border px-3 py-2 rounded"
            placeholder="+15551234567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={!smsChecked}
          />
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Unsubscribing…' : 'Unsubscribe'}
        </button>
        {message && <div className="text-sm">{message}</div>}
      </form>
    </div>
  );
}
