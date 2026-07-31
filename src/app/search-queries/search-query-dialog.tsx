'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { EmploymentTypeSchema } from '@/shared/schemas/job-posting';
import { NOTIFICATION_INTERVALS, type NotificationInterval, type SearchCriteria } from '@/shared/schemas/search-query';
import { createSearchQueryAction, updateSearchQueryAction } from './actions';

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Vollzeit',
  part_time: 'Teilzeit',
  internship: 'Praktikum',
  working_student: 'Werkstudent',
  minijob: 'Minijob',
  freelance: 'Freelance/Selbstständig',
};

const INTERVAL_LABELS: Record<NotificationInterval, string> = {
  instant: 'Stündlich',
  daily: 'Täglich',
};

const selectClassName = 'h-8 w-full border border-neutral-300 px-2 text-sm';

const MAX_RADIUS_KM = 100;

export type SearchQueryRow = {
  id: string;
  criteria: SearchCriteria;
  interval: NotificationInterval;
  active: boolean;
};

export type DialogTarget = { mode: 'create' } | { mode: 'edit'; query: SearchQueryRow };

const EMPTY_CRITERIA: SearchCriteria = { keywords: [] };

export function SearchQueryDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DialogTarget | null;
}) {
  const isEditMode = target?.mode === 'edit';
  const criteria = target?.mode === 'edit' ? target.query.criteria : EMPTY_CRITERIA;

  const [keywords, setKeywords] = useState<string[]>(criteria.keywords);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [location, setLocation] = useState(criteria.location ?? '');
  const [radiusKm, setRadiusKm] = useState(criteria.radiusKm ?? 0);
  const [remote, setRemote] = useState(criteria.remote ?? false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(criteria.employmentTypes ?? []);
  const [interval, setInterval] = useState<NotificationInterval>(
    target?.mode === 'edit' ? target.query.interval : 'daily',
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const nextCriteria = target?.mode === 'edit' ? target.query.criteria : EMPTY_CRITERIA;
    setKeywords(nextCriteria.keywords);
    setKeywordDraft('');
    setLocation(nextCriteria.location ?? '');
    setRadiusKm(nextCriteria.radiusKm ?? 0);
    setRemote(nextCriteria.remote ?? false);
    setEmploymentTypes(nextCriteria.employmentTypes ?? []);
    setInterval(target?.mode === 'edit' ? target.query.interval : 'daily');
    setError(null);
  }, [open, target]);

  function addKeyword() {
    const value = keywordDraft.trim();
    if (!value || keywords.includes(value)) {
      setKeywordDraft('');
      return;
    }
    setKeywords((prev) => [...prev, value]);
    setKeywordDraft('');
  }

  function handleKeywordKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addKeyword();
    }
  }

  function toggleEmploymentType(type: string, checked: boolean) {
    setEmploymentTypes((prev) => (checked ? [...prev, type] : prev.filter((t) => t !== type)));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const input = {
          criteria: {
            keywords,
            location: location || undefined,
            radiusKm: radiusKm > 0 ? radiusKm : undefined,
            remote: remote || undefined,
            employmentTypes: employmentTypes.length > 0 ? employmentTypes : undefined,
          },
          interval,
        };

        if (isEditMode) {
          await updateSearchQueryAction(target.query.id, input);
        } else {
          await createSearchQueryAction(input);
        }
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Suchauftrag konnte nicht gespeichert werden');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Suchauftrag bearbeiten' : 'Suchauftrag anlegen'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="keywords">Stichwörter</Label>
            <div className="flex flex-wrap gap-1.5 pb-1.5">
              {keywords.map((keyword, index) => (
                <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => setKeywords((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                    aria-label={`${keyword} entfernen`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="keywords"
                placeholder="z.B. Softwareentwickler"
                value={keywordDraft}
                onChange={(event) => setKeywordDraft(event.target.value)}
                onKeyDown={handleKeywordKeyDown}
                className="max-w-64"
              />
              <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                + Hinzufügen
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="location">Ort</Label>
            <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="radiusKm">Umkreis</Label>
              <span className="text-sm text-neutral-500">{radiusKm > 0 ? `${radiusKm} km` : 'egal'}</span>
            </div>
            <Slider
              id="radiusKm"
              min={0}
              max={MAX_RADIUS_KM}
              step={5}
              value={[radiusKm]}
              onValueChange={([value]) => setRadiusKm(value ?? 0)}
              className="pt-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="remote" checked={remote} onCheckedChange={(checked) => setRemote(checked === true)} />
            <Label htmlFor="remote">Nur Remote/Homeoffice</Label>
          </div>

          <div>
            <Label>Beschäftigungsart</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {EmploymentTypeSchema.options.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`employmentType-${type}`}
                    checked={employmentTypes.includes(type)}
                    onCheckedChange={(checked) => toggleEmploymentType(type, checked === true)}
                  />
                  <Label htmlFor={`employmentType-${type}`}>{EMPLOYMENT_TYPE_LABELS[type] ?? type}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="interval">Prüfintervall</Label>
            <select
              id="interval"
              className={selectClassName}
              value={interval}
              onChange={(event) => setInterval(event.target.value as NotificationInterval)}
            >
              {NOTIFICATION_INTERVALS.map((value) => (
                <option key={value} value={value}>
                  {INTERVAL_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={keywords.length === 0 || isPending}>
            {isPending ? 'Speichert …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
