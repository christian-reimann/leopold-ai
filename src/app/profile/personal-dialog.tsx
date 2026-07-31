'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Address, Contact, Personal, Profile } from '@/shared/schemas/profile';
import { updateProfile } from './actions';

export function PersonalDialog({
  open,
  onOpenChange,
  profile,
  profileId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  profileId?: string;
}) {
  const [draft, setDraft] = useState<Personal>(() => profile.personal);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(profile.personal);
      setError(null);
    }
  }, [open, profile]);

  function patch(patch: Partial<Personal>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function patchAddress(patch: Partial<Address>) {
    setDraft((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  }

  function patchContact(patch: Partial<Contact>) {
    setDraft((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateProfile({ id: profileId, ...profile, personal: draft });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Persönliche Daten</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="role">Rolle</Label>
              <Input id="role" value={draft.role} onChange={(event) => patch({ role: event.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-600">Adresse</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={draft.address.street}
                  onChange={(event) => patchAddress({ street: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zipcode">PLZ</Label>
                <Input
                  id="zipcode"
                  value={draft.address.zipcode}
                  onChange={(event) => patchAddress({ zipcode: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Ort</Label>
                <Input
                  id="location"
                  value={draft.address.location}
                  onChange={(event) => patchAddress({ location: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={draft.address.country}
                  onChange={(event) => patchAddress({ country: event.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-600">Kontakt</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  value={draft.contact.email}
                  onChange={(event) => patchContact({ email: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={draft.contact.phone}
                  onChange={(event) => patchContact({ phone: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="linkedIn">LinkedIn</Label>
                <Input
                  id="linkedIn"
                  value={draft.contact.linkedIn ?? ''}
                  onChange={(event) => patchContact({ linkedIn: event.target.value || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  value={draft.contact.github ?? ''}
                  onChange={(event) => patchContact({ github: event.target.value || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="homepage">Homepage</Label>
                <Input
                  id="homepage"
                  value={draft.contact.homepage ?? ''}
                  onChange={(event) => patchContact({ homepage: event.target.value || undefined })}
                />
              </div>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Speichert …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
