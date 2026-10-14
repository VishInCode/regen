import { useLocation, useNavigate } from 'react-router';
import { Compass } from 'lucide-react';

const names: Record<string, string> = {
  '/saved': 'Saved Places',
  '/reports': 'Reports',
  '/layers': 'Data Layers',
  '/settings': 'Settings',
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const name = names[pathname] ?? 'Page not found';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-32 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas-soft text-terra">
        <Compass className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">{name}</h1>
      <p className="mt-2 text-sm text-muted">
        This section is part of the REGEN platform and is ready to be wired to live data.
        In the meantime, explore the map or analyze a location.
      </p>
      <button
        onClick={() => navigate('/')}
        className="mt-5 rounded-xl bg-forest-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest"
      >
        Back to Home
      </button>
    </div>
  );
}
