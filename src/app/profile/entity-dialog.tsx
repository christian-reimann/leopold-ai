'use client';

import { type ReactNode, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Profile } from '@/shared/schemas/profile';
import { updateProfile } from './actions';

export type ArrayField = 'education' | 'experiences' | 'projects' | 'skills' | 'strengths' | 'languages' | 'interests';

export function EntityDialog<T>({
  open,
  onOpenChange,
  title,
  profile,
  profileId,
  field,
  index,
  emptyItem,
  renderFields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  profile: Profile;
  profileId?: string;
  field: ArrayField;
  index: number | null;
  emptyItem: T;
  renderFields: (item: T, patch: (patch: Partial<T>) => void) => ReactNode;
}) {
  const list = profile[field] as unknown as T[];

  function resolveItem() {
    if (index === null) return emptyItem;
    return list[index] ?? emptyItem;
  }

  const [item, setItem] = useState<T>(resolveItem);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setItem(resolveItem());
      setError(null);
    }
  }, [open, index]);

  function patch(patch: Partial<T>) {
    setItem((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const nextList = index !== null ? list.map((entry, i) => (i === index ? item : entry)) : [...list, item];
        await updateProfile({ id: profileId, ...profile, [field]: nextList });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
      }
    });
  }

  function handleDelete() {
    if (index === null) return;
    setError(null);
    startTransition(async () => {
      try {
        const nextList = list.filter((_, i) => i !== index);
        await updateProfile({ id: profileId, ...profile, [field]: nextList });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">{renderFields(item, patch)}</div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          {index !== null && (
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={isPending}>
              Entfernen
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Speichert …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
