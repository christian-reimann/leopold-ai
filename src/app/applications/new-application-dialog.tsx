'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApplicationOptionsFields, type ApplicationOptionsValue } from './application-options-fields';
import { createApplicationAction } from './actions';

const DEFAULT_OPTIONS: ApplicationOptionsValue = {
  tone: 'neutral',
  personality: [],
  language: 'de',
  colorScheme: 'slate',
};

export function NewApplicationDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<ApplicationOptionsValue>(DEFAULT_OPTIONS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createApplicationAction({
          jobId,
          options: { ...options, layoutTemplate: 'standard' },
        });
        onOpenChange(false);
        router.push(`/applications/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bewerbung konnte nicht angelegt werden');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bewerbung erstellen</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          für <span className="font-medium text-foreground">{jobTitle}</span>
        </p>

        <ApplicationOptionsFields value={options} onChange={setOptions} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Wird angelegt …' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
