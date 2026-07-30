'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmploymentTypeSchema } from '@/shared/schemas/job-posting';
import { NOTIFICATION_INTERVALS, type NotificationInterval, type SearchCriteria } from '@/shared/schemas/search-query';
import { createSearchQueryAction, updateSearchQueryAction } from './actions';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
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

type SearchQueryFormProps =
  | { searchQueryId?: undefined; initial?: undefined; onSaved?: undefined; onCancel?: undefined }
  | {
      searchQueryId: string;
      initial: { criteria: SearchCriteria; interval: NotificationInterval };
      onSaved: () => void;
      onCancel: () => void;
    };

export function SearchQueryForm({ searchQueryId, initial, onSaved, onCancel }: SearchQueryFormProps = {}) {
  const [keywords, setKeywords] = useState<string[]>(initial?.criteria.keywords ?? []);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [location, setLocation] = useState(initial?.criteria.location ?? '');
  const [radiusKm, setRadiusKm] = useState(initial?.criteria.radiusKm?.toString() ?? '');
  const [remote, setRemote] = useState(initial?.criteria.remote ?? false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(initial?.criteria.employmentTypes ?? []);
  const [interval, setInterval] = useState<NotificationInterval>(initial?.interval ?? 'daily');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const isEditMode = searchQueryId !== undefined;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const input = {
          criteria: {
            keywords,
            location: location || undefined,
            radiusKm: radiusKm ? Number(radiusKm) : undefined,
            remote: remote || undefined,
            employmentTypes: employmentTypes.length > 0 ? employmentTypes : undefined,
          },
          interval,
        };

        if (isEditMode) {
          await updateSearchQueryAction(searchQueryId, input);
          onSaved();
          return;
        }

        await createSearchQueryAction(input);
        setKeywords([]);
        setLocation('');
        setRadiusKm('');
        setRemote(false);
        setEmploymentTypes([]);
        setInterval('daily');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Suchauftrag konnte nicht gespeichert werden');
      }
    });
  }

  return (
    <div className="space-y-4 border border-neutral-200 p-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">Ort</Label>
          <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="radiusKm">Umkreis (km)</Label>
          <Input
            id="radiusKm"
            type="number"
            min="0"
            value={radiusKm}
            onChange={(event) => setRadiusKm(event.target.value)}
          />
        </div>
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

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSubmit} disabled={keywords.length === 0 || isPending}>
          {isEditMode ? (isPending ? 'Speichert …' : 'Speichern') : isPending ? 'Legt an …' : 'Suchauftrag anlegen'}
        </Button>
        {isEditMode && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Abbrechen
          </Button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
