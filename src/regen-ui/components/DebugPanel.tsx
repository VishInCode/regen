import { useState } from 'react';
import { Bug, X } from 'lucide-react';
import { useLocationStore } from '../lib/location-store';

/**
 * Development-only inspector to verify that the selected location and its data
 * are genuinely changing. Rendered only during local development.
 */
export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const { selected, locationExplicit, analysisRadius, activeLayers } = useLocationStore();

  if (process.env.NODE_ENV !== 'development') return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[900] flex h-10 w-10 items-center justify-center rounded-full bg-forest-deep text-white shadow-lg"
        title="Location debug"
      >
        <Bug className="h-4 w-4" />
      </button>
    );
  }

  const rows: [string, string][] = [
    ['Location', selected.name],
    ['Explicitly chosen', String(locationExplicit)],
    ['Latitude', selected.latitude.toFixed(5)],
    ['Longitude', selected.longitude.toFixed(5)],
    ['Source', selected.source?.name ?? '—'],
    ['Population', selected.population != null ? selected.population.toLocaleString('en-IN') : 'n/a'],
    ['Radius (m)', String(analysisRadius)],
    ['Active layers', activeLayers.join(', ') || '—'],
  ];

  return (
    <div className="fixed bottom-4 right-4 z-[900] w-72 rounded-xl border border-line bg-white/95 p-3 font-mono text-[11px] shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <Bug className="h-3.5 w-3.5" /> Location Debug
        </span>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted">{k}</dt>
            <dd className="truncate text-right text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
