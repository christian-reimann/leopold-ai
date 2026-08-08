'use client';

import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/shared/schemas/profile';
import {
  EducationDialog,
  ExperienceDialog,
  InterestDialog,
  LanguageDialog,
  ProjectDialog,
  SkillCategoryDialog,
  StrengthDialog,
} from './profile-entity-dialogs';
import { PersonalDialog } from './personal-dialog';

type EditTarget =
  | { kind: 'personal' }
  | { kind: 'education'; index: number | null }
  | { kind: 'experience'; index: number | null }
  | { kind: 'project'; index: number | null }
  | { kind: 'skillCategory'; index: number | null }
  | { kind: 'strength'; index: number | null }
  | { kind: 'language'; index: number | null }
  | { kind: 'interest'; index: number | null };

function formatRange(startDate: string, endDate?: string) {
  return `${startDate} – ${endDate ?? 'heute'}`;
}

function indexFor(target: EditTarget | null, kind: Exclude<EditTarget['kind'], 'personal'>) {
  return target?.kind === kind ? target.index : null;
}

export function ProfileView({ profile }: { profile: Profile }) {
  const [target, setTarget] = useState<EditTarget | null>(null);
  const close = () => setTarget(null);

  const { name, role, address, contact } = profile.personal;
  const { education, experiences, projects, skills, strengths, languages, interests } = profile;

  const addressLine = [address.street, [address.zipcode, address.location].filter(Boolean).join(' '), address.country]
    .filter(Boolean)
    .join(', ');

  const contactItems = [contact.email, contact.phone, contact.linkedIn, contact.github, contact.homepage].filter(
    Boolean,
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => setTarget({ kind: 'personal' })}
        className="-m-2 block w-full space-y-2 rounded-md p-2 text-left hover:bg-neutral-50"
      >
        <div>
          <h3 className="text-base font-semibold">{name || 'Ohne Namen'}</h3>
          {role && <p className="text-sm text-neutral-600">{role}</p>}
        </div>
        {addressLine && <p className="text-sm text-neutral-600">{addressLine}</p>}
        {contactItems.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
            {contactItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
      </button>

      <CompactSection title="Berufserfahrung" onAdd={() => setTarget({ kind: 'experience', index: null })}>
        {experiences.map((entry, index) => (
          <CompactEntry
            key={index}
            title={entry.role}
            subtitle={entry.company}
            range={formatRange(entry.startDate, entry.endDate)}
            onClick={() => setTarget({ kind: 'experience', index })}
          />
        ))}
      </CompactSection>

      <CompactSection title="Ausbildung" onAdd={() => setTarget({ kind: 'education', index: null })}>
        {education.map((entry, index) => (
          <CompactEntry
            key={index}
            title={entry.degree}
            subtitle={entry.institution}
            range={formatRange(entry.startDate, entry.endDate)}
            onClick={() => setTarget({ kind: 'education', index })}
          />
        ))}
      </CompactSection>

      <CompactSection title="Projekte" onAdd={() => setTarget({ kind: 'project', index: null })}>
        {projects.map((entry, index) => (
          <CompactEntry
            key={index}
            title={entry.title}
            subtitle={entry.client}
            range={formatRange(entry.startDate, entry.endDate)}
            onClick={() => setTarget({ kind: 'project', index })}
          />
        ))}
      </CompactSection>

      <CompactSection title="Skills" onAdd={() => setTarget({ kind: 'skillCategory', index: null })}>
        <div className="space-y-1.5">
          {skills.map((category, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setTarget({ kind: 'skillCategory', index })}
              className="-m-1 flex w-full flex-wrap items-center gap-1.5 rounded-md p-1 text-left text-sm hover:bg-neutral-50"
            >
              <span className="font-medium text-neutral-700">{category.name}:</span>
              {category.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </button>
          ))}
        </div>
      </CompactSection>

      <CompactSection title="Stärken" onAdd={() => setTarget({ kind: 'strength', index: null })}>
        <div className="flex flex-wrap gap-1.5">
          {strengths.map((entry, index) => (
            <button key={entry.name} type="button" onClick={() => setTarget({ kind: 'strength', index })}>
              <Badge variant="secondary">{entry.name}</Badge>
            </button>
          ))}
        </div>
      </CompactSection>

      <CompactSection title="Sprachen" onAdd={() => setTarget({ kind: 'language', index: null })}>
        <div className="flex flex-wrap gap-1.5 text-sm text-neutral-600">
          {languages.map((entry, index) => (
            <button
              key={entry.language}
              type="button"
              onClick={() => setTarget({ kind: 'language', index })}
              className="rounded-md px-1 hover:bg-neutral-50"
            >
              {entry.language} ({entry.level})
            </button>
          ))}
        </div>
      </CompactSection>

      <CompactSection title="Interessen" onAdd={() => setTarget({ kind: 'interest', index: null })}>
        <div className="flex flex-wrap gap-1.5">
          {interests.map((entry, index) => (
            <button key={entry.name} type="button" onClick={() => setTarget({ kind: 'interest', index })}>
              <Badge variant="secondary">{entry.name}</Badge>
            </button>
          ))}
        </div>
      </CompactSection>

      <PersonalDialog open={target?.kind === 'personal'} onOpenChange={(open) => !open && close()} profile={profile} />
      <ExperienceDialog
        open={target?.kind === 'experience'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'experience')}
        profile={profile}
      />
      <EducationDialog
        open={target?.kind === 'education'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'education')}
        profile={profile}
      />
      <ProjectDialog
        open={target?.kind === 'project'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'project')}
        profile={profile}
      />
      <SkillCategoryDialog
        open={target?.kind === 'skillCategory'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'skillCategory')}
        profile={profile}
      />
      <StrengthDialog
        open={target?.kind === 'strength'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'strength')}
        profile={profile}
      />
      <LanguageDialog
        open={target?.kind === 'language'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'language')}
        profile={profile}
      />
      <InterestDialog
        open={target?.kind === 'interest'}
        onOpenChange={(open) => !open && close()}
        index={indexFor(target, 'interest')}
        profile={profile}
      />
    </div>
  );
}

function CompactSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{title}</h4>
        <Button type="button" size="icon-xs" variant="ghost" onClick={onAdd} aria-label={`${title} hinzufügen`}>
          <Plus className="size-3.5" />
        </Button>
      </div>
      {children}
    </section>
  );
}

function CompactEntry({
  title,
  subtitle,
  range,
  onClick,
}: {
  title: string;
  subtitle?: string;
  range: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-m-1 flex w-full flex-wrap items-baseline justify-between gap-x-3 rounded-md p-1 text-left text-sm hover:bg-neutral-50"
    >
      <span className="font-medium">
        {title}
        {subtitle ? <span className="font-normal text-neutral-500"> · {subtitle}</span> : null}
      </span>
      <span className="text-neutral-500">{range}</span>
    </button>
  );
}
