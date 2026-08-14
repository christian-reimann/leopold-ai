import type { ApplicationColorScheme, ApplicationLayoutId } from '@/shared/schemas/application';
import type { Profile } from '@/shared/schemas/profile';

export type DocType = 'cv' | 'letter';

export const DOC_TYPE_LABELS: Record<DocType, string> = { letter: 'Anschreiben', cv: 'Lebenslauf' };

export type RenderDocumentInput = {
  profile: Profile;
  docType: DocType;
  content: string;
  colorScheme: ApplicationColorScheme;
};

/**
 * `renderDocument` returns a complete, self-contained HTML document
 * (incl. <html>/<head>/<body>) for the Puppeteer PDF export – always for exactly one
 * document (cover letter OR CV, exported separately). `editorStyles` provides the same
 * visual rules as a CSS fragment, scoped under `rootSelector`, so the editor in the
 * browser can be edited directly in the layout's look (no separate preview document
 * anymore).
 */
export interface LayoutTemplate {
  readonly id: ApplicationLayoutId;
  readonly label: string;
  renderDocument(input: RenderDocumentInput): string;
  editorStyles(colorScheme: ApplicationColorScheme, rootSelector: string): string;
}
