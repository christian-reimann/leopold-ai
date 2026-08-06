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
 * `renderDocument` liefert ein vollständiges, eigenständiges HTML-Dokument
 * (inkl. <html>/<head>/<body>) für den Puppeteer-PDF-Export – jeweils für genau ein
 * Dokument (Anschreiben ODER Lebenslauf, getrennter Export). `editorStyles` liefert
 * dieselben visuellen Regeln als CSS-Fragment, unter `rootSelector` skopiert, damit der
 * Editor im Browser direkt im Layout-Look editierbar ist (kein separates Vorschau-Dokument
 * mehr).
 */
export interface LayoutTemplate {
  readonly id: ApplicationLayoutId;
  readonly label: string;
  renderDocument(input: RenderDocumentInput): string;
  editorStyles(colorScheme: ApplicationColorScheme, rootSelector: string): string;
}
