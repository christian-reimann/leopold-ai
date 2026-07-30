'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmploymentTypeSchema } from '@/shared/schemas/job-posting';
import { NOTIFICATION_INTERVALS, type NotificationInterval } from '@/shared/schemas/search-query';
import { createSearchQueryAction } from './actions';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Vollzeit',
  part_time: 'Teilzeit',
  internship: 'Praktikum',
  working_student: 'Werkstudent',
  minijob: 'Minijob',
  freelance: 'Freelance/Selbstständig',
};

const INTERVAL_LABELS: Record<NotificationInterval, string> = {
  instant: 'Sofort (stündlich geprüft)',
  daily: 'Täglich',
};

const selectClassName = 'h-8 w-full border border-neutral-300 px-2 text-sm';

export function SearchQueryForm() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [location, setLocation] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [remote, setRemote] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [postedWithinDays, setPostedWithinDays] = useState('');
  const [interval, setInterval] = useState<NotificationInterval>('daily');

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

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createSearchQueryAction({
          criteria: {
            keywords,
            location: location || undefined,
            radiusKm: radiusKm ? Number(radiusKm) : undefined,
            remote: remote || undefined,
            employmentTypes: employmentTypes.length > 0 ? employmentTypes : undefined,
            postedWithinDays: postedWithinDays ? Number(postedWithinDays) : undefined,
          },
          interval,
        });
        setKeywords([]);
        setLocation('');
        setRadiusKm('');
        setRemote(false);
        setEmploymentTypes([]);
        setPostedWithinDays('');
        setInterval('daily');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Suchauftrag konnte nicht angelegt werden');
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

      <div className="grid grid-cols-3 gap-4">
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
        <div>
          <Label htmlFor="postedWithinDays">Veröffentlicht seit (Tagen)</Label>
          <Input
            id="postedWithinDays"
            type="number"
            min="0"
            value={postedWithinDays}
            onChange={(event) => setPostedWithinDays(event.target.value)}
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
          {isPending ? 'Legt an …' : 'Suchauftrag anlegen'}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
