'use client';

import { Check, ChevronDown, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { createProfileAction, deleteProfileAction, renameProfileAction, switchProfileAction } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const canDelete = profiles.length > 1;

  function handleSwitch(id: string) {
    startTransition(async () => {
      await switchProfileAction(id);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      await deleteProfileAction(target.id);
      setDeleteTarget(null);
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
            <DropdownMenuItem key={profile.id} onSelect={() => handleSwitch(profile.id)} className="group/item">
              <Check className={profile.id === activeProfileId ? 'opacity-100' : 'opacity-0'} />
              <span className="flex-1">{profile.name}</span>
              <button
                type="button"
                className="rounded-sm p-0.5 opacity-0 hover:text-foreground group-hover/item:opacity-100"
                aria-label={`Profil "${profile.name}" umbenennen`}
                onClick={(event) => {
                  event.stopPropagation();
                  setRenameTarget({ id: profile.id, name: profile.name });
                }}
              >
                <Pencil className="size-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="rounded-sm p-0.5 opacity-0 hover:text-red-600 group-hover/item:opacity-100"
                  aria-label={`Profil "${profile.name}" löschen`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget({ id: profile.id, name: profile.name });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus />
            Neues Profil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileNameDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
      <ProfileNameDialog
        mode="rename"
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        profile={renameTarget}
      />
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profil löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Profil „{deleteTarget?.name}“ wird zusammen mit allen zugehörigen Dokumenten, Bewerbungen,
              Konversationen und Matches unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProfileNameDialog({
  mode,
  open,
  onOpenChange,
  profile,
}: {
  mode: 'create' | 'rename';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: { id: string; name: string } | null;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setName(mode === 'rename' ? (profile?.name ?? '') : '');
  }, [open, mode, profile]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    setError(null);
    startTransition(async () => {
      if (mode === 'rename' && profile) {
        await renameProfileAction(profile.id, trimmed);
      } else {
        await createProfileAction(trimmed);
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'rename' ? 'Profil umbenennen' : 'Neues Profil'}</DialogTitle>
        </DialogHeader>
        <Input placeholder="Name des Profils" value={name} onChange={(event) => setName(event.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Speichern …' : mode === 'rename' ? 'Speichern' : 'Anlegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
