import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { documents } from '@/db/schema/documents';
import { profiles } from '@/db/schema/profiles';
import { extractProfile } from '@/llm/profile-extraction';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cv: 'Lebenslauf',
  cover_letter: 'Anschreiben',
  certificate: 'Zertifikat',
};

/**
 * MVP: Einzelnutzer-Tool, es gibt genau ein aktives Profil (die erste Zeile).
 * Manuelles Editieren (src/app/profile/actions.ts) setzt source auf "manual";
 * eine erneute Extraktion überschreibt das wieder mit "extracted".
 *
 * Die Extraktion läuft immer über den gesamten hier übergebenen Dokumentpool
 * gemeinsam (nicht pro Dokument einzeln), damit sich z. B. Lebenslauf,
 * Anschreiben und Zertifikate gegenseitig ergänzen.
 */
export async function extractProfileFromDocuments(documentIds: string[]): Promise<void> {
  const [existing] = await db.select({ id: profiles.id }).from(profiles).limit(1);
  let profileId: string;
  if (existing) {
    profileId = existing.id;
    await db
      .update(profiles)
      .set({ status: 'processing', error: null, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));
  } else {
    const [created] = await db
      .insert(profiles)
      .values({ source: 'extracted', status: 'processing' })
      .returning({ id: profiles.id });
    if (!created) {
      throw new Error('Profil konnte nicht angelegt werden');
    }
    profileId = created.id;
  }

  try {
    const docs = await db.select().from(documents).where(inArray(documents.id, documentIds));

    const missingIds = documentIds.filter((id) => !docs.some((doc) => doc.id === id));
    if (missingIds.length > 0) {
      throw new Error(`Dokument(e) nicht gefunden: ${missingIds.join(', ')}`);
    }
    const unparsed = docs.filter((doc) => !doc.extractedText);
    if (unparsed.length > 0) {
      throw new Error(`Dokument(e) wurden noch nicht geparst: ${unparsed.map((doc) => doc.id).join(', ')}`);
    }

    const combinedText = docs
      .map((doc) => `--- ${DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} ---\n${doc.extractedText}`)
      .join('\n\n');

    const profileData = await extractProfile(combinedText);

    await db
      .update(profiles)
      .set({ data: profileData, source: 'extracted', status: 'done', error: null, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));
  } catch (error) {
    await db
      .update(profiles)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Profil-Extraktion',
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId));
    throw error;
  }
}
