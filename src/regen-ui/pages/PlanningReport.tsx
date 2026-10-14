import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Building2,
  TrendingUp,
  Layers,
  Shield,
  Users2,
  Droplets,
  Route,
  Wheat,
  Search,
  Loader2,
  MapPinOff,
  ArrowLeft,
} from 'lucide-react';
import RegenMap from '../components/RegenMap';
import { Card, Meter, StatusPill } from '../components/ui';
import { useLocationStore } from '../lib/location-store';
import { useLocationSearch } from '../lib/hooks/useLocationSearch';
import { useLocationAnalysis } from '../lib/hooks/useLocationAnalysis';
import type { Location } from '../data/types';

const CONTEXTS = {
  urban: {
    tag: 'Urban Planning',
    title: 'Urban Development',
    body: 'Assess population support, infrastructure, land use and resilience for city-scale planning decisions.',
    themes: [
      { icon: TrendingUp, key: 'commercial', label: 'Growth & Commercial Activity', cats: ['retail', 'food', 'finance'] },
      { icon: Building2, key: 'infrastructure', label: 'Infrastructure & Services', cats: ['healthcare', 'education', 'government'] },
      { icon: Layers, key: 'access', label: 'Mobility & Access', cats: ['transport'] },
      { icon: Shield, key: 'amenity', label: 'Livability & Recreation', cats: ['recreation'] },
    ],
  },
  rural: {
    tag: 'Rural Planning',
    title: 'Rural Development',
    body: 'Understand agriculture, connectivity, basic services and resources to support inclusive rural growth.',
    themes: [
      { icon: Wheat, key: 'agri', label: 'Agriculture & Land Use', cats: ['agriculture'] },
      { icon: Route, key: 'connect', label: 'Connectivity', cats: ['transport'] },
      { icon: Users2, key: 'services', label: 'Basic Services', cats: ['healthcare', 'education', 'government'] },
      { icon: Droplets, key: 'resource', label: 'Local Economy', cats: ['retail', 'food'] },
    ],
  },
} as const;

export default function PlanningReport() {
  const { context } = useParams<{ context: string }>();
  const navigate = useNavigate();
  const ctx = CONTEXTS[(context as keyof typeof CONTEXTS) ?? 'urban'] ?? CONTEXTS.urban;

  const { selected, setSelected, locationExplicit, analysisRadius } = useLocationStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading: searching } = useLocationSearch(query);
  const { analysis, loading } = useLocationAnalysis(locationExplicit ? selected : null, analysisRadius);

  const choose = (l: Location) => {
    setSelected(l, { explicit: true });
    setQuery('');
    setOpen(false);
  };

  const count = (cat: string) => analysis?.facilities.find((f) => f.category === cat)?.count ?? 0;
  const themeScore = (cats: readonly string[]) =>
    Math.min(100, Math.round((cats.reduce((s, c) => s + count(c), 0) / (cats.length * 8)) * 100));

  return (
    <div className="mx-auto max-w-6xl space-y-5 pt-2 pb-6">
      <button
        onClick={() => navigate('/public')}
        className="flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Public Planning
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{ctx.tag}</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-ink md:text-5xl">{ctx.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{ctx.body}</p>
        </div>
        {locationExplicit && (
          <span className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink">
            {selected.name} · {(analysisRadius / 1000).toFixed(0)} km
          </span>
        )}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search an area to build a planning report..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {searching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
          </div>
          {open && query.trim().length >= 2 && results.length > 0 && (
            <div className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
              {results.map((l) => (
                <button
                  key={l.id}
                  onMouseDown={() => choose(l)}
                  className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-canvas-soft"
                >
                  <span className="font-medium text-ink">{l.name}</span>
                  <span className="block truncate text-xs text-muted">{l.displayName ?? l.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {!locationExplicit ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <MapPinOff className="h-9 w-9 text-muted" />
          <p className="mt-3 font-serif text-2xl font-semibold text-ink">Select an area to begin</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Search above to generate a {ctx.tag.toLowerCase()} report from open geospatial data.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-line">
            <RegenMap
              center={[selected.latitude, selected.longitude]}
              zoom={13}
              className="h-full min-h-[360px]"
              pois={analysis?.pois.slice(0, 60) ?? []}
              radiusCircle={{ center: [selected.latitude, selected.longitude], radius: analysisRadius }}
              markers={[{ id: selected.id, lat: selected.latitude, lng: selected.longitude, color: '#4f9d69' }]}
            />
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-ink">Planning Themes</h2>
              <StatusPill status={analysis?.degraded ? 'fallback' : 'estimated'} />
            </div>
            <div className="space-y-4">
              {ctx.themes.map((t) => {
                const v = themeScore(t.cats);
                return (
                  <div key={t.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <t.icon className="h-4 w-4 text-terra" strokeWidth={1.75} /> {t.label}
                      </span>
                      <span className="font-semibold text-ink">{loading ? '…' : `${v}/100`}</span>
                    </div>
                    <Meter value={v} max={100} />
                    <p className="mt-1 text-xs text-muted">
                      {t.cats.map((c) => `${count(c)} ${c}`).join(' · ')} within radius.
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted">
              Themes are estimated from {analysis?.degraded ? 'REGEN fallback data' : 'OpenStreetMap'} facility counts.
              Population, budgets and official plans are not inferred.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
