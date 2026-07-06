"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit3, Megaphone, Plus, Save, Trash2, X } from 'lucide-react';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from '@/lib/announcements';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types/supabase';
import { Alert, Button, FormInput, FormTextarea, LoadingSpinner } from '@/components/ui';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const refresh = useCallback(async () => {
    const rows = await getAnnouncements();
    setAnnouncements(rows);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setUserId(uid);

      if (uid) {
        const [{ count }] = await Promise.all([
          supabase
            .from('app_admins')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', uid),
          refresh(),
        ]);
        setIsAdmin(!!count && count > 0);
      }

      setLoading(false);
    })();
  }, [refresh]);

  const submit = async () => {
    if (!userId || !title.trim() || !body.trim()) return;
    setSaving(true);
    setMessage(null);

    const announcement = await createAnnouncement({
      authorUserId: userId,
      title,
      body,
    });

    setSaving(false);

    if (!announcement) {
      setMessage('Failed to create announcement. Admin permission may be missing.');
      return;
    }

    setTitle('');
    setBody('');
    await refresh();
  };

  const beginEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditBody(announcement.body);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
  };

  const saveEdit = async (announcementId: string) => {
    if (!editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    setMessage(null);

    const ok = await updateAnnouncement(announcementId, {
      title: editTitle,
      body: editBody,
    });

    setSaving(false);

    if (!ok) {
      setMessage('Failed to update announcement. Admin permission may be missing.');
      return;
    }

    cancelEdit();
    await refresh();
  };

  const remove = async (announcementId: string) => {
    if (!confirm('Delete this announcement?')) return;
    setSaving(true);
    setMessage(null);

    const ok = await deleteAnnouncement(announcementId);
    setSaving(false);

    if (!ok) {
      setMessage('Failed to delete announcement. Admin permission may be missing.');
      return;
    }

    await refresh();
  };

  if (loading) {
    return <LoadingSpinner text="Loading announcements..." className="py-12" />;
  }

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Alert variant="info">
          Please <Link href="/auth/sign-in" className="underline">sign in</Link> to read club
          announcements.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {isAdmin ? (
        <section className="card-elevated p-5 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Megaphone className="w-5 h-5" />
            <h2 className="font-display font-bold text-lg text-foreground">
              Post an official update
            </h2>
          </div>
          <FormInput
            value={title}
            onChange={e => setTitle(e.target.value)}
            label="Title"
            placeholder="Announcement title"
          />
          <FormTextarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            placeholder="Write the club-wide announcement..."
            className="md:max-w-none lg:max-w-none"
          />
          {message && (
            <Alert variant="error" onClose={() => setMessage(null)}>
              {message}
            </Alert>
          )}
          <Button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim() || !body.trim()}
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Posting...' : 'Post announcement'}
          </Button>
        </section>
      ) : (
        <Alert variant="info">
          This hub is read-only for members. Official updates are posted by club admins.
        </Alert>
      )}

      <section className="space-y-4">
        {announcements.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-foreground-muted">No official announcements yet.</p>
          </div>
        ) : (
          announcements.map(announcement => {
            const isEditing = editingId === announcement.id;
            const created = new Date(announcement.created_at);
            const updated = new Date(announcement.updated_at);
            const wasEdited = updated.getTime() - created.getTime() > 1000;

            return (
              <article key={announcement.id} className="card p-5 space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-primary">
                        <Megaphone className="w-3 h-3" />
                        Official
                      </span>
                      <time
                        className="text-xs text-foreground-subtle"
                        dateTime={announcement.created_at}
                      >
                        {created.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                    </div>
                    {wasEdited && (
                      <p className="mt-1 text-xs text-foreground-faint">
                        Updated {updated.toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                  </div>

                  {isAdmin && !isEditing && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEdit(announcement)}
                        aria-label="Edit announcement"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(announcement.id)}
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </header>

                {isEditing ? (
                  <div className="space-y-3">
                    <FormInput
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      label="Title"
                    />
                    <FormTextarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={5}
                      className="md:max-w-none lg:max-w-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(announcement.id)}
                        disabled={saving || !editTitle.trim() || !editBody.trim()}
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">
                      {announcement.title}
                    </h2>
                    <p className="mt-3 text-foreground whitespace-pre-wrap leading-relaxed">
                      {announcement.body}
                    </p>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
