'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { updateProfile } from './actions';

const textareaClassName = 'w-full border border-neutral-300 px-2 py-1 text-sm';
const selectClassName = 'h-8 w-full border border-neutral-300 px-2 text-sm';

function useList<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);

  const add = (item: T) => setItems((prev) => [...prev, item]);
  const update = (index: number, patch: Partial<T>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  return { items, setItems, add, update, remove };
}

export function ProfileForm({ profileId, profile }: { profileId?: string; profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);

  const [street, setStreet] = useState(profile.address.street);
  const [zipcode, setZipcode] = useState(profile.address.zipcode);
  const [location, setLocation] = useState(profile.address.location);
  const [country, setCountry] = useState(profile.address.country);

  const [email, setEmail] = useState(profile.contact.email);
  const [phone, setPhone] = useState(profile.contact.phone);
  const [linkedIn, setLinkedIn] = useState(profile.contact.linkedIn ?? '');
  const [github, setGithub] = useState(profile.contact.github ?? '');
  const [homepage, setHomepage] = useState(profile.contact.homepage ?? '');

  const education = useList<Education>(profile.education);
  const experiences = useList<Experience>(profile.experiences);
  const projects = useList<Project>(profile.projects);
  const skillCategories = useList<SkillCategory>(profile.skills);
  const strengths = useList<Strength>(profile.strengths);
  const languages = useList<LanguageSkill>(profile.languages);
  const interests = useList<Interest>(profile.interests);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateProfile({
          id: profileId,
          name,
          role,
          address: { street, zipcode, location, country },
          contact: {
            email,
            phone,
            linkedIn: linkedIn || undefined,
            github: github || undefined,
            homepage: homepage || undefined,
          },
          education: education.items,
          experiences: experiences.items,
          projects: projects.items,
          skills: skillCategories.items,
          strengths: strengths.items,
          languages: languages.items,
          interests: interests.items,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="stammdaten">
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="ausbildung">Ausbildung</TabsTrigger>
          <TabsTrigger value="berufserfahrung">Berufserfahrung</TabsTrigger>
          <TabsTrigger value="projekte">Projekte</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="staerken">Stärken</TabsTrigger>
          <TabsTrigger value="sprachen">Sprachen</TabsTrigger>
          <TabsTrigger value="interessen">Interessen</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten" className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-600">Stammdaten</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="role">Rolle</Label>
                <Input id="role" value={role} onChange={(event) => setRole(event.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-600">Adresse</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Straße</Label>
                <Input id="street" value={street} onChange={(event) => setStreet(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="zipcode">PLZ</Label>
                <Input id="zipcode" value={zipcode} onChange={(event) => setZipcode(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="location">Ort</Label>
                <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="country">Land</Label>
                <Input id="country" value={country} onChange={(event) => setCountry(event.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-600">Kontakt</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="linkedIn">LinkedIn</Label>
                <Input id="linkedIn" value={linkedIn} onChange={(event) => setLinkedIn(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="github">GitHub</Label>
                <Input id="github" value={github} onChange={(event) => setGithub(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="homepage">Homepage</Label>
                <Input id="homepage" value={homepage} onChange={(event) => setHomepage(event.target.value)} />
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="ausbildung" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Ausbildung</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => education.add({ degree: '', institution: '', startDate: '', description: '' })}
            >
              + Eintrag
            </Button>
          </div>
          <div className="space-y-4">
            {education.items.map((entry, index) => (
              <div key={index} className="space-y-2 border border-neutral-200 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Abschluss"
                    value={entry.degree}
                    onChange={(event) => education.update(index, { degree: event.target.value })}
                  />
                  <Input
                    placeholder="Institution"
                    value={entry.institution}
                    onChange={(event) => education.update(index, { institution: event.target.value })}
                  />
                  <Input
                    placeholder="Start (MM.YYYY)"
                    value={entry.startDate}
                    onChange={(event) => education.update(index, { startDate: event.target.value })}
                  />
                  <Input
                    placeholder="Ende (MM.YYYY, leer = aktuell)"
                    value={entry.endDate ?? ''}
                    onChange={(event) => education.update(index, { endDate: event.target.value || undefined })}
                  />
                </div>
                <textarea
                  placeholder="Beschreibung"
                  value={entry.description}
                  onChange={(event) => education.update(index, { description: event.target.value })}
                  rows={2}
                  className={textareaClassName}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => education.remove(index)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="berufserfahrung" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Berufserfahrung</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                experiences.add({
                  role: '',
                  employmentType: 'full-time',
                  startDate: '',
                  description: '',
                })
              }
            >
              + Eintrag
            </Button>
          </div>
          <div className="space-y-4">
            {experiences.items.map((entry, index) => (
              <div key={index} className="space-y-2 border border-neutral-200 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Rolle"
                    value={entry.role}
                    onChange={(event) => experiences.update(index, { role: event.target.value })}
                  />
                  <Input
                    placeholder="Unternehmen"
                    value={entry.company ?? ''}
                    onChange={(event) => experiences.update(index, { company: event.target.value || undefined })}
                  />
                  <select
                    className={selectClassName}
                    value={entry.employmentType}
                    onChange={(event) =>
                      experiences.update(index, {
                        employmentType: event.target.value as Experience['employmentType'],
                      })
                    }
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
                    onChange={(event) => experiences.update(index, { startDate: event.target.value })}
                  />
                  <Input
                    placeholder="Ende (MM.YYYY, leer = aktuell)"
                    value={entry.endDate ?? ''}
                    onChange={(event) => experiences.update(index, { endDate: event.target.value || undefined })}
                  />
                </div>
                <textarea
                  placeholder="Beschreibung"
                  value={entry.description}
                  onChange={(event) => experiences.update(index, { description: event.target.value })}
                  rows={2}
                  className={textareaClassName}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => experiences.remove(index)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="projekte" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Projekte</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => projects.add({ title: '', startDate: '', description: '' })}
            >
              + Eintrag
            </Button>
          </div>
          <div className="space-y-4">
            {projects.items.map((entry, index) => (
              <div key={index} className="space-y-2 border border-neutral-200 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Titel"
                    value={entry.title}
                    onChange={(event) => projects.update(index, { title: event.target.value })}
                  />
                  <Input
                    placeholder="Kunde"
                    value={entry.client ?? ''}
                    onChange={(event) => projects.update(index, { client: event.target.value || undefined })}
                  />
                  <Input
                    placeholder="Start (MM.YYYY)"
                    value={entry.startDate}
                    onChange={(event) => projects.update(index, { startDate: event.target.value })}
                  />
                  <Input
                    placeholder="Ende (MM.YYYY, leer = aktuell)"
                    value={entry.endDate ?? ''}
                    onChange={(event) => projects.update(index, { endDate: event.target.value || undefined })}
                  />
                </div>
                <textarea
                  placeholder="Beschreibung"
                  value={entry.description}
                  onChange={(event) => projects.update(index, { description: event.target.value })}
                  rows={2}
                  className={textareaClassName}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => projects.remove(index)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Skills</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => skillCategories.add({ name: '', skills: [] })}
            >
              + Kategorie
            </Button>
          </div>
          <div className="space-y-4">
            {skillCategories.items.map((category, categoryIndex) => (
              <SkillCategoryEditor
                key={categoryIndex}
                category={category}
                onChange={(patch) => skillCategories.update(categoryIndex, patch)}
                onRemove={() => skillCategories.remove(categoryIndex)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="staerken" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Stärken</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => strengths.add({ name: '', description: '' })}
            >
              + Eintrag
            </Button>
          </div>
          <div className="space-y-4">
            {strengths.items.map((entry, index) => (
              <div key={index} className="space-y-2 border border-neutral-200 p-3">
                <Input
                  placeholder="Name"
                  value={entry.name}
                  onChange={(event) => strengths.update(index, { name: event.target.value })}
                />
                <textarea
                  placeholder="Beschreibung"
                  value={entry.description}
                  onChange={(event) => strengths.update(index, { description: event.target.value })}
                  rows={2}
                  className={textareaClassName}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => strengths.remove(index)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sprachen" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Sprachen</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => languages.add({ language: '', level: 'B2' })}
            >
              + Eintrag
            </Button>
          </div>
          <div className="space-y-2">
            {languages.items.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Sprache"
                  value={entry.language}
                  onChange={(event) => languages.update(index, { language: event.target.value })}
                />
                <select
                  className={selectClassName}
                  value={entry.level}
                  onChange={(event) => languages.update(index, { level: event.target.value as LanguageSkill['level'] })}
                >
                  {LANGUAGE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="sm" onClick={() => languages.remove(index)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="interessen" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-600">Interessen</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => interests.add({ name: '', description: '' })}
            >
              + Eintrag
            </Button>
          </div>
          <div className="space-y-4">
            {interests.items.map((entry, index) => (
              <div key={index} className="space-y-2 border border-neutral-200 p-3">
                <Input
                  placeholder="Name"
                  value={entry.name}
                  onChange={(event) => interests.update(index, { name: event.target.value })}
                />
                <textarea
                  placeholder="Beschreibung"
                  value={entry.description}
                  onChange={(event) => interests.update(index, { description: event.target.value })}
                  rows={2}
                  className={textareaClassName}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => interests.remove(index)}>
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Speichert …' : 'Speichern'}
        </Button>
        {saved && <span className="text-sm text-green-600">Gespeichert.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function SkillCategoryEditor({
  category,
  onChange,
  onRemove,
}: {
  category: SkillCategory;
  onChange: (patch: Partial<SkillCategory>) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState('');

  const addSkill = () => {
    const value = draft.trim();
    if (!value || category.skills.includes(value)) {
      setDraft('');
      return;
    }
    onChange({ skills: [...category.skills, value] });
    setDraft('');
  };

  const removeSkill = (index: number) => onChange({ skills: category.skills.filter((_, i) => i !== index) });

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-2 border border-neutral-200 p-3">
      <Input
        placeholder="Kategorie"
        value={category.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />
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
          className="max-w-64"
        />
        <Button type="button" variant="outline" size="sm" onClick={addSkill}>
          + Skill
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Kategorie entfernen
        </Button>
      </div>
    </div>
  );
}
