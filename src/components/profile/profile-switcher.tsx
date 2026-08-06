'use client';

import { useState, useTransition } from 'react';
import { createProfileAction, switchProfileAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const NEW_PROFILE_VALUE = '__new__';

export function ProfileSwitcher({
  profiles,
  activeProfileId,
}: {
  profiles: { id: string; name: string }[];
  activeProfileId: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (value === NEW_PROFILE_VALUE) {
      setCreateOpen(true);
      return;
    }
    startTransition(async () => {
      await switchProfileAction(value);
    });
  }

  return (
    <>
      <select
        className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm"
        value={activeProfileId}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Aktives Profil"
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}
          </option>
        ))}
        <option value={NEW_PROFILE_VALUE}>+ Neues Profil</option>
      </select>
      <NewProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function NewProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    setError(null);
    startTransition(async () => {
      await createProfileAction(trimmed);
      setName('');
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Profil</DialogTitle>
        </DialogHeader>
        <Input placeholder="Name des Profils" value={name} onChange={(event) => setName(event.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" onClick={handleCreate} disabled={isPending}>
            {isPending ? 'Anlegen …' : 'Anlegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
