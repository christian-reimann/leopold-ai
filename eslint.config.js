import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/**
 * Ersetzt physische Package-Grenzen: erzwingt zur Lint-Zeit dieselbe
 * Abhängigkeitsrichtung, die vorher packages/* durchgesetzt hätte
 * (siehe LEOPOLD-PROJEKTPLAN.md §4, "Modularer Monolith").
 */
function zone(target, forbiddenFrom) {
  return {
    target: `./src/${target}`,
    from: forbiddenFrom.map((folder) => `./src/${folder}`),
  };
}

export default tseslint.config(
  { ignores: ['.next/', 'dist/', 'drizzle/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { typescript: true },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            zone('shared', ['db', 'llm', 'connectors', 'core', 'worker', 'app']),
            zone('db', ['llm', 'connectors', 'core', 'worker', 'app']),
            zone('llm', ['db', 'connectors', 'core', 'worker', 'app']),
            zone('connectors', ['db', 'llm', 'core', 'worker', 'app']),
            zone('core', ['connectors', 'worker', 'app']),
            zone('worker', ['app']),
            zone('app', ['llm', 'connectors', 'worker', 'db']),
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
