import { desc, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { searchQueries } from '@/db/schema/search-queries';
import { SearchQueryForm } from './search-query-form';
import { SearchQueryList } from './search-query-list';

export default async function SearchQueriesPage() {
  const [queries, postings] = await Promise.all([
    db.select().from(searchQueries).orderBy(desc(searchQueries.createdAt)),
    db
      .select()
      .from(jobPostings)
      .where(isNull(jobPostings.duplicateOfId))
      .orderBy(desc(jobPostings.createdAt))
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="mb-1 text-lg font-semibold">Suchaufträge</h1>
        <SearchQueryForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-600">Angelegte Suchaufträge</h2>
        <SearchQueryList
          searchQueries={queries.map((query) => ({
            id: query.id,
            criteria: query.criteria,
            interval: query.interval,
            active: query.active,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-600">Zuletzt gefundene Stellen</h2>
        {postings.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Stellen gefunden. Suchaufträge laufen im Hintergrund.</p>
        )}
        {postings.length > 0 && (
          <ul className="divide-y divide-neutral-200 border border-neutral-200">
            {postings.map((posting) => (
              <li key={posting.id} className="space-y-1 px-4 py-3">
                <a
                  href={posting.data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium hover:underline"
                >
                  {posting.data.title}
                </a>
                <p className="text-xs text-neutral-500">
                  {posting.data.company}
                  {posting.data.location ? ` · ${posting.data.location}` : ''} · {posting.sourceConnector}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
