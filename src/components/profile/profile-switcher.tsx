'use client';

import { Check, ChevronDown, Plus, UserRound } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createProfileAction, switchProfileAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export function ProfileSwitcher({
  profiles,
  activeProfileId,
}: {
  profiles: { id: string; name: string }[];
  activeProfileId: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  function handleSwitch(id: string) {
    startTransition(async () => {
      await switchProfileAction(id);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={isPending}>
            <UserRound className="size-3.5" />
            {activeProfile?.name ?? 'Profil'}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {profiles.map((profile) => (
            <DropdownMenuItem key={profile.id} onSelect={() => handleSwitch(profile.id)}>
              <Check className={profile.id === activeProfileId ? 'opacity-100' : 'opacity-0'} />
              {profile.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus />
            Neues Profil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
