'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { updateApplicationOptionsAction } from './actions';
import { ApplicationOptionsFields, type ApplicationOptionsValue } from './application-options-fields';

export function ApplicationSettingsDialog({
  open,
  onOpenChange,
  applicationId,
  initialOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  initialOptions: ApplicationOptionsValue;
}) {
  const [options, setOptions] = useState<ApplicationOptionsValue>(initialOptions);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateApplicationOptionsAction(applicationId, options);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht gespeichert werden');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Einstellungen bearbeiten</DialogTitle>
        </DialogHeader>

        <ApplicationOptionsFields value={options} onChange={setOptions} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Speichert …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
