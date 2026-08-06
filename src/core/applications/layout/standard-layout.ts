import type { ApplicationColorScheme } from '@/shared/schemas/application';
import { COLOR_SCHEMES } from './color-schemes';
import { DOC_TYPE_LABELS, type LayoutTemplate, type RenderDocumentInput } from './layout-template';

function documentCss(colorScheme: ApplicationColorScheme, root: string): string {
  const { accent, accentSoft } = COLOR_SCHEMES[colorScheme];

  return `
    ${root} { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.5; }
    ${root} header { border-bottom: 2px solid ${accent}; padding-bottom: 12px; margin-bottom: 24px; }
    ${root} header h1 { margin: 0; font-size: 22px; color: ${accent}; }
    ${root} header p { margin: 2px 0; font-size: 12px; color: #4b5563; }
    ${root} section { margin-bottom: 24px; }
    ${root} section h2 {
      font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;
      color: ${accent}; background: ${accentSoft}; padding: 4px 8px; margin-bottom: 12px;
    }
    ${root} p { margin: 0 0 10px; font-size: 13px; }
    ${root} ul { margin: 0 0 10px; padding-left: 20px; font-size: 13px; }
    ${root} h3 { font-size: 14px; color: ${accent}; margin: 14px 0 4px; }
  `;
}

export class StandardLayoutTemplate implements LayoutTemplate {
  readonly id = 'standard' as const;
  readonly label = 'Standard';

  renderDocument({ profile, docType, content, colorScheme }: RenderDocumentInput): string {
    const { name, role, address, contact } = profile.personal;

    return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 20mm 18mm; }
      ${documentCss(colorScheme, 'body')}
    </style>
  </head>
  <body>
    <header>
      <h1>${name}</h1>
      <p>${role}</p>
      <p>${address.street}, ${address.zipcode} ${address.location}</p>
      <p>${contact.email} · ${contact.phone}</p>
    </header>

    <section>
      <h2>${DOC_TYPE_LABELS[docType]}</h2>
      ${content}
    </section>
  </body>
</html>`;
  }

  editorStyles(colorScheme: ApplicationColorScheme, rootSelector: string): string {
    return documentCss(colorScheme, rootSelector);
  }
}

export const standardLayoutTemplate = new StandardLayoutTemplate();
