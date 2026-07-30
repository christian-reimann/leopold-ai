import { matchingService } from '@/core/matching/matching-service';

export default async function MatchesPage() {
  const rows = await matchingService.listRecent(50);

  return (
    <div className="space-y-3">
      <h1 className="mb-1 text-lg font-semibold">Matches</h1>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">Noch keine Matches – Suchaufträge laufen im Hintergrund.</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {rows.map((row) => (
            <li key={row.id} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <a href={row.data.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                  {row.data.title}
                </a>
                <span className="text-sm font-semibold">{Math.round(row.score)} %</span>
              </div>
              <p className="text-xs text-neutral-500">
                {row.data.company}
                {row.data.location ? ` · ${row.data.location}` : ''} · {row.sourceConnector}
              </p>
              <p className="text-sm text-neutral-700">{row.reasoning}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
