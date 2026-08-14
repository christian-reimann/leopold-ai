/**
 * Groups of interchangeable job titles (mainly German/English), so connectors without their
 * own facet search (e.g. arbeitnow) don't have to rely on the exact wording of a search term.
 * If a search term matches a group, every term in the group counts as a match instead of just
 * the literal string.
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
  // Only match short terms exactly, to avoid accidental substring hits (e.g. "ui").
  if (Math.min(keyword.length, alias.length) < 3) {
    return false;
  }
  return keyword.includes(alias) || alias.includes(keyword);
}

/**
 * Returns all interchangeable terms for a normalized keyword. If it doesn't match any known
 * group, only the keyword itself is returned (plain substring matching is thus preserved as
 * before for uncovered terms).
 */
export function expandKeyword(normalizedKeyword: string): readonly string[] {
  const group = KEYWORD_SYNONYM_GROUPS.find((aliases) =>
    aliases.some((alias) => matchesAlias(normalizedKeyword, alias)),
  );
  return group ?? [normalizedKeyword];
}
