'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  EMPLOYMENT_TYPES,
  LANGUAGE_LEVELS,
  type Education,
  type Experience,
  type Interest,
  type LanguageSkill,
  type Profile,
  type Project,
  type SkillCategory,
  type Strength,
} from '@/shared/schemas/profile';
import { EntityDialog } from './entity-dialog';

const textareaClassName = 'w-full border border-neutral-300 px-2 py-1 text-sm';
const selectClassName = 'h-8 w-full border border-neutral-300 px-2 text-sm';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number | null;
  profile: Profile;
  profileId?: string;
};

export function ExperienceDialog(props: DialogProps) {
  return (
    <EntityDialog<Experience>
      {...props}
      field="experiences"
      title="Berufserfahrung"
      emptyItem={{ role: '', employmentType: 'full-time', startDate: '', description: '' }}
      renderFields={(entry, patch) => (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Rolle" value={entry.role} onChange={(event) => patch({ role: event.target.value })} />
            <Input
              placeholder="Unternehmen"
              value={entry.company ?? ''}
              onChange={(event) => patch({ company: event.target.value || undefined })}
            />
            <select
              className={selectClassName}
              value={entry.employmentType}
              onChange={(event) => patch({ employmentType: event.target.value as Experience['employmentType'] })}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Input
              placeholder="Start (MM.YYYY)"
              value={entry.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
            <Input
              placeholder="Ende (MM.YYYY, leer = aktuell)"
              value={entry.endDate ?? ''}
              onChange={(event) => patch({ endDate: event.target.value || undefined })}
            />
          </div>
          <textarea
            placeholder="Beschreibung"
            value={entry.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            className={textareaClassName}
          />
        </>
      )}
    />
  );
}

export function EducationDialog(props: DialogProps) {
  return (
    <EntityDialog<Education>
      {...props}
      field="education"
      title="Ausbildung"
      emptyItem={{ degree: '', institution: '', startDate: '', description: '' }}
      renderFields={(entry, patch) => (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Abschluss"
              value={entry.degree}
              onChange={(event) => patch({ degree: event.target.value })}
            />
            <Input
              placeholder="Institution"
              value={entry.institution}
              onChange={(event) => patch({ institution: event.target.value })}
            />
            <Input
              placeholder="Start (MM.YYYY)"
              value={entry.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
            <Input
              placeholder="Ende (MM.YYYY, leer = aktuell)"
              value={entry.endDate ?? ''}
              onChange={(event) => patch({ endDate: event.target.value || undefined })}
            />
          </div>
          <textarea
            placeholder="Beschreibung"
            value={entry.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            className={textareaClassName}
          />
        </>
      )}
    />
  );
}

export function ProjectDialog(props: DialogProps) {
  return (
    <EntityDialog<Project>
      {...props}
      field="projects"
      title="Projekt"
      emptyItem={{ title: '', startDate: '', description: '' }}
      renderFields={(entry, patch) => (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Titel" value={entry.title} onChange={(event) => patch({ title: event.target.value })} />
            <Input
              placeholder="Kunde"
              value={entry.client ?? ''}
              onChange={(event) => patch({ client: event.target.value || undefined })}
            />
            <Input
              placeholder="Start (MM.YYYY)"
              value={entry.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
            <Input
              placeholder="Ende (MM.YYYY, leer = aktuell)"
              value={entry.endDate ?? ''}
              onChange={(event) => patch({ endDate: event.target.value || undefined })}
            />
          </div>
          <textarea
            placeholder="Beschreibung"
            value={entry.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            className={textareaClassName}
          />
        </>
      )}
    />
  );
}

export function SkillCategoryDialog(props: DialogProps) {
  return (
    <EntityDialog<SkillCategory>
      {...props}
      field="skills"
      title="Skill-Kategorie"
      emptyItem={{ name: '', skills: [] }}
      renderFields={(category, patch) => <SkillCategoryFields category={category} patch={patch} />}
    />
  );
}

function SkillCategoryFields({
  category,
  patch,
}: {
  category: SkillCategory;
  patch: (patch: Partial<SkillCategory>) => void;
}) {
  const [draft, setDraft] = useState('');

  const addSkill = () => {
    const value = draft.trim();
    if (!value || category.skills.includes(value)) {
      setDraft('');
      return;
    }
    patch({ skills: [...category.skills, value] });
    setDraft('');
  };

  const removeSkill = (index: number) => patch({ skills: category.skills.filter((_, i) => i !== index) });

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkill();
    }
  };

  return (
    <>
      <Input placeholder="Kategorie" value={category.name} onChange={(event) => patch({ name: event.target.value })} />
      <div className="flex flex-wrap gap-1.5">
        {category.skills.map((skill, index) => (
          <Badge key={skill} variant="secondary" className="gap-1 pr-1">
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="rounded-full p-0.5 hover:bg-foreground/10"
              aria-label={`${skill} entfernen`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Skill hinzufügen …"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" variant="outline" size="sm" onClick={addSkill}>
          + Skill
        </Button>
      </div>
    </>
  );
}

export function StrengthDialog(props: DialogProps) {
  return (
    <EntityDialog<Strength>
      {...props}
      field="strengths"
      title="Stärke"
      emptyItem={{ name: '', description: '' }}
      renderFields={(entry, patch) => (
        <>
          <Input placeholder="Name" value={entry.name} onChange={(event) => patch({ name: event.target.value })} />
          <textarea
            placeholder="Beschreibung"
            value={entry.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            className={textareaClassName}
          />
        </>
      )}
    />
  );
}

export function InterestDialog(props: DialogProps) {
  return (
    <EntityDialog<Interest>
      {...props}
      field="interests"
      title="Interesse"
      emptyItem={{ name: '', description: '' }}
      renderFields={(entry, patch) => (
        <>
          <Input placeholder="Name" value={entry.name} onChange={(event) => patch({ name: event.target.value })} />
          <textarea
            placeholder="Beschreibung"
            value={entry.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
            className={textareaClassName}
          />
        </>
      )}
    />
  );
}

export function LanguageDialog(props: DialogProps) {
  return (
    <EntityDialog<LanguageSkill>
      {...props}
      field="languages"
      title="Sprache"
      emptyItem={{ language: '', level: 'B2' }}
      renderFields={(entry, patch) => (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Sprache"
            value={entry.language}
            onChange={(event) => patch({ language: event.target.value })}
          />
          <select
            className={selectClassName}
            value={entry.level}
            onChange={(event) => patch({ level: event.target.value as LanguageSkill['level'] })}
          >
            {LANGUAGE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      )}
    />
  );
}
