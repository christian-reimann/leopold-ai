import type { ApplicationColorScheme, ApplicationLayoutId } from '@/shared/schemas/application';
import type { Profile } from '@/shared/schemas/profile';

export type RenderDocumentInput = {
  profile: Profile;
  cvContent: string;
  letterContent: string;
  colorScheme: ApplicationColorScheme;
};

/**
 * `renderDocument` liefert ein vollständiges, eigenständiges HTML-Dokument
 * (inkl. <html>/<head>/<body>) für den Puppeteer-PDF-Export. `editorStyles`
 * liefert dieselben visuellen Regeln als CSS-Fragment, unter `rootSelector`
 * skopiert, damit der Editor im Browser direkt im Layout-Look editierbar ist
 * (kein separates Vorschau-Dokument mehr).
 */
export interface LayoutTemplate {
  readonly id: ApplicationLayoutId;
  readonly label: string;
  renderDocument(input: RenderDocumentInput): string;
  editorStyles(colorScheme: ApplicationColorScheme, rootSelector: string): string;
}
