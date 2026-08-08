/**
 * Gruppen austauschbarer Berufsbezeichnungen (v.a. deutsch/englisch), damit Connectors ohne
 * eigene Facettensuche (z.B. arbeitnow) nicht auf den exakten Wortlaut eines Suchbegriffs
 * angewiesen sind. Passt ein Suchbegriff auf eine Gruppe, gilt jeder Begriff der Gruppe als
 * Treffer statt nur der Literal-String.
 */
export const KEYWORD_SYNONYM_GROUPS: ReadonlyArray<readonly string[]> = [
  [
    'softwareentwickler',
    'software-entwickler',
    'softwareentwicklerin',
    'softwareentwicklung',
    'anwendungsentwickler',
    'anwendungsentwicklung',
    'entwickler',
    'developer',
    'software developer',
    'software engineer',
    'programmierer',
    'programmer',
    'backend developer',
    'backend engineer',
    'frontend developer',
    'frontend engineer',
    'full stack developer',
    'fullstack developer',
    'full-stack engineer',
  ],
  ['data engineer', 'data engineering', 'dateningenieur', 'datenbankentwickler'],
  ['data scientist', 'data science', 'datenwissenschaftler'],
  ['devops engineer', 'devops', 'sysadmin', 'systemadministrator', 'system engineer'],
  ['ux designer', 'ui designer', 'ux/ui designer', 'produktdesigner'],
  ['product manager', 'produktmanager', 'product owner'],
  ['projektmanager', 'project manager', 'projektleiter'],
  ['qa engineer', 'test engineer', 'tester', 'qualitätssicherung', 'testmanager'],
];

function matchesAlias(keyword: string, alias: string): boolean {
  if (keyword === alias) {
    return true;
  }
  // Kurze Begriffe nur exakt matchen, um Zufallstreffer als Teilstring zu vermeiden (z.B. "ui").
  if (Math.min(keyword.length, alias.length) < 3) {
    return false;
  }
  return keyword.includes(alias) || alias.includes(keyword);
}

/**
 * Liefert alle austauschbaren Begriffe für ein normalisiertes Keyword. Passt es auf keine
 * bekannte Gruppe, wird nur das Keyword selbst zurückgegeben (reines Substring-Matching bleibt
 * damit für nicht abgedeckte Begriffe wie zuvor erhalten).
 */
export function expandKeyword(normalizedKeyword: string): readonly string[] {
  const group = KEYWORD_SYNONYM_GROUPS.find((aliases) =>
    aliases.some((alias) => matchesAlias(normalizedKeyword, alias)),
  );
  return group ?? [normalizedKeyword];
}
