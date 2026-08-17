/**
 * Tests the registered job connectors (src/connectors/impl/*) under real conditions
 * against the actual (unofficial) APIs/sites – no mocking.
 *
 * Usage:
 *   pnpm connectors:test scripts/connector-scenarios/<scenario>.json [more.json ...]
 *
 * A scenario is a JSON file in the shape of SearchCriteria
 * (src/shared/schemas/search-query.ts). An empty/missing "connectors" field tests all
 * registered connectors, otherwise only the given IDs.
 */
import { readFileSync } from 'node:fs';
import { BaseConnector } from '@/connectors/base-connector';
import type { JobConnector } from '@/connectors/connector';
import { connectorRegistry } from '@/connectors/registered-connectors';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { SearchCriteriaSchema } from '@/shared/schemas/search-query';

function resolveConnectors(ids: string[] | undefined): JobConnector[] {
  if (!ids || ids.length === 0) {
    return connectorRegistry.getAll();
  }
  return ids.map((id) => {
    const connector = connectorRegistry.getById(id);
    if (!connector) {
      const known = connectorRegistry
        .getAll()
        .map((c) => c.id)
        .join(', ');
      throw new Error(`Unknown connector "${id}". Registered: ${known}`);
    }
    return connector;
  });
}

async function runConnector(connector: JobConnector, criteria: SearchCriteria): Promise<void> {
  console.log(`\n--- ${connector.id} ---`);
  const start = Date.now();
  try {
    const results = await connector.search(criteria);
    const durationMs = Date.now() - start;
    const stats = connector instanceof BaseConnector ? connector.lastRunStats : undefined;

    if (stats) {
      const dropRatePercent = stats.rawCount > 0 ? Math.round((stats.droppedCount / stats.rawCount) * 100) : 0;
      console.log(
        `${stats.mappedCount}/${stats.rawCount} raw records mapped (${dropRatePercent}% dropped), ${durationMs}ms`,
      );
      if (stats.droppedCount > 0) {
        console.warn(
          `⚠ ${stats.droppedCount} record(s) failed JobPostingSchema – possible API/site drift. Sample raw data:`,
        );
        console.warn(JSON.stringify(stats.droppedSamples[0], null, 2));
      }
    } else {
      console.log(`${results.length} hits, ${durationMs}ms`);
    }

    if (results.length === 0) {
      console.log('  (no hits)');
    }
    for (const result of results.slice(0, 3)) {
      console.log(`  • ${result.posting.title} — ${result.posting.company} (${result.posting.location ?? 'n/a'})`);
      console.log(`    ${result.posting.url}`);
    }
  } catch (error) {
    const durationMs = Date.now() - start;
    console.error(`✗ Failed after ${durationMs}ms: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function runScenario(filePath: string): Promise<void> {
  console.log(`\n=== Scenario: ${filePath} ===`);

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`✗ Could not read scenario: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  const parsed = SearchCriteriaSchema.safeParse(rawJson);
  if (!parsed.success) {
    console.error(`✗ Invalid SearchCriteria: ${parsed.error.message}`);
    process.exitCode = 1;
    return;
  }
  const criteria = parsed.data;
  console.log(`Criteria: ${JSON.stringify(criteria)}`);

  let connectors: JobConnector[];
  try {
    connectors = resolveConnectors(criteria.connectors);
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  // Sequential rather than parallel – mirroring the connectors themselves (e.g. the
  // Arbeitsagentur detail requests), to avoid hammering the unofficial APIs/sites at once.
  for (const connector of connectors) {
    await runConnector(connector, criteria);
  }
}

async function main(): Promise<void> {
  const scenarioFiles = process.argv.slice(2);
  if (scenarioFiles.length === 0) {
    console.error('Usage: pnpm connectors:test <scenario.json> [more.json ...]');
    process.exitCode = 1;
    return;
  }
  for (const file of scenarioFiles) {
    await runScenario(file);
  }
}

void main();
