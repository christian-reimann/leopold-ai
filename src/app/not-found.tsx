import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-lg bg-secondary px-6 py-16 text-center">
      <h1 className="font-heading text-3xl text-foreground">Seite nicht gefunden</h1>
      <p className="max-w-md text-muted-foreground">
        Die gesuchte Seite existiert nicht oder wurde entfernt.
      </p>
      <Button asChild>
        <Link href="/">Zur Startseite</Link>
      </Button>
    </div>
  );
}
