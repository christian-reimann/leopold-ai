'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { COLOR_SCHEMES } from '@/core/applications/layout/color-schemes';
import {
  APPLICATION_COLOR_SCHEMES,
  APPLICATION_LANGUAGES,
  APPLICATION_TONES,
  PERSONALITY_TRAITS,
  type ApplicationColorScheme,
  type ApplicationLanguage,
  type ApplicationTone,
  type PersonalityTrait,
} from '@/shared/schemas/application';

export const TONE_LABELS: Record<ApplicationTone, string> = {
  formal: 'Formell',
  neutral: 'Sachlich-neutral',
  confident: 'Selbstbewusst',
  creative: 'Kreativ',
};

export const LANGUAGE_LABELS: Record<ApplicationLanguage, string> = {
  de: 'Deutsch',
  en: 'Englisch',
};

export const PERSONALITY_LABELS: Record<PersonalityTrait, string> = {
  analytical: 'Analytisch',
  creative: 'Kreativ',
  team_oriented: 'Teamorientiert',
  results_oriented: 'Ergebnisorientiert',
  empathetic: 'Empathisch',
  down_to_earth: 'Bodenständig',
};

export const selectClassName = 'h-8 w-full border border-neutral-300 px-2 text-sm';

export type ApplicationOptionsValue = {
  tone: ApplicationTone;
  personality: PersonalityTrait[];
  language: ApplicationLanguage;
  colorScheme: ApplicationColorScheme;
};

export function ApplicationOptionsFields({
  value,
  onChange,
}: {
  value: ApplicationOptionsValue;
  onChange: (next: ApplicationOptionsValue) => void;
}) {
  function togglePersonality(trait: PersonalityTrait, checked: boolean) {
    onChange({
      ...value,
      personality: checked ? [...value.personality, trait] : value.personality.filter((t) => t !== trait),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tone">Tonalität</Label>
        <select
          id="tone"
          className={selectClassName}
          value={value.tone}
          onChange={(event) => onChange({ ...value, tone: event.target.value as ApplicationTone })}
        >
          {APPLICATION_TONES.map((tone) => (
            <option key={tone} value={tone}>
              {TONE_LABELS[tone]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="language">Sprache</Label>
        <select
          id="language"
          className={selectClassName}
          value={value.language}
          onChange={(event) => onChange({ ...value, language: event.target.value as ApplicationLanguage })}
        >
          {APPLICATION_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {LANGUAGE_LABELS[language]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Persönlichkeit</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {PERSONALITY_TRAITS.map((trait) => (
            <div key={trait} className="flex items-center gap-2">
              <Checkbox
                id={`personality-${trait}`}
                checked={value.personality.includes(trait)}
                onCheckedChange={(checked) => togglePersonality(trait, checked === true)}
              />
              <Label htmlFor={`personality-${trait}`}>{PERSONALITY_LABELS[trait]}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Farbschema</Label>
        <div className="flex gap-2 pt-1">
          {APPLICATION_COLOR_SCHEMES.map((colorScheme) => (
            <button
              key={colorScheme}
              type="button"
              onClick={() => onChange({ ...value, colorScheme })}
              aria-label={colorScheme}
              className="size-7 rounded-full border-2"
              style={{
                backgroundColor: COLOR_SCHEMES[colorScheme].accent,
                borderColor: value.colorScheme === colorScheme ? COLOR_SCHEMES[colorScheme].accent : 'transparent',
                outline: value.colorScheme === colorScheme ? `2px solid ${COLOR_SCHEMES[colorScheme].accent}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
