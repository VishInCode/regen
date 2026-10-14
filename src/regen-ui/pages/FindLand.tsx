import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, MapPin, ChevronDown, X } from 'lucide-react';
import RegenMap from '../components/RegenMap';
import { PotentialBadge } from '../components/ui';
import type { LandOpportunity } from '../data/types';
import { fetchLandOpportunities } from '../lib/api/landOpportunities';
import { useLocationStore } from '../lib/location-store';

const potentialColor: Record<string, string> = {
  High: '#4f9d69',
  Moderate: '#e0a53f',
  Emerging: '#cf6a3d',
  Low: '#cf5b4a',
};

const filterFields = [
  { label: 'Purpose', value: 'Real Estate' },
  { label: 'Land Use Type', value: 'All Types' },
  { label: 'Area Size', value: '1 – 50 acres' },
  { label: 'Budget (Optional)', value: 'Any' },
  { label: 'Development Potential', value: 'High, Moderate' },
];

const landUseFilters = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use'];

export default function FindLand() {
  const navigate = useNavigate();
  const { selected, saved, toggleSaved } = useLocationStore();
  const [opportunities, setOpportunities] = useState<LandOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'Map' | 'List'>('Map');
  const [category, setCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(true);
  const [checked, setChecked] = useState<string[]>(['Residential']);
  const [radiusKm, setRadiusKm] = useState(10);
  const [sort, setSort] = useState<'Potential' | 'Acres' | 'Price'>('Potential');
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchLandOpportunities(selected.latitude, selected.longitude, radiusKm, controller.signal)
      .then(setOpportunities)
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setError('Land opportunity data could not be loaded. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected.latitude, selected.longitude, radiusKm]);

  const toggleCheck = (l: string) =>
    setChecked((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]));
  const toggleExpand = (s: string) =>
    setExpanded((e) => (e.includes(s) ? e.filter((x) => x !== s) : [...e, s]));
  const openLand = (land: LandOpportunity) =>
    navigate(`/find-land/${encodeURIComponent(land.id)}?lat=${selected.latitude}&lng=${selected.longitude}&radiusKm=${radiusKm}`);

  const cats = ['All', 'Residential', 'Commercial', 'Industrial', 'Agricultural'];
  const potentialRank: Record<string, number> = { High: 3, Moderate: 2, Emerging: 1, Low: 0 };
  const priceNum = (p: string) => Number(p.replace(/[^\d.]/g, '')) || 0;

  const list = opportunities.filter((l) => {
    if (category !== 'All' && !l.landUse.includes(category)) return false;
    if (checked.length > 0 && !checked.some((c) => l.landUse.includes(c))) return false;
    return true;
  }).sort((a, b) => {
    if (sort === 'Acres') return b.acres - a.acres;
    if (sort === 'Price') return priceNum(a.price) - priceNum(b.price);
    return potentialRank[b.potential] - potentialRank[a.potential];
  });

  const resetFilters = () => {
    setChecked([]);
    setCategory('All');
    setRadiusKm(10);
    setExpanded([]);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-ink">Find Land</h1>
          <p className="mt-1 text-sm text-muted">
            Discover land opportunities based on your goals and data insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-white p-1 shadow-sm">
            {(['Map', 'List'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
                  view === v ? 'bg-forest-deep text-white' : 'text-muted'
                }`}
              >
                {v} View
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/saved')}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas-soft"
          >
            <Bookmark className="h-4 w-4" /> Saved Searches ({saved.length})
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mx-5 mb-3 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-3">
        {filterFields.map((f) => (
          <div key={f.label} className="min-w-[9rem] flex-1">
            <label className="text-xs text-muted">{f.label}</label>
            <button
              onClick={() => {
                setView('Map');
                setShowFilters(true);
              }}
              className="mt-1 flex w-full items-center justify-between rounded-lg border border-line bg-canvas-soft px-3 py-2 text-sm text-ink transition hover:border-terra/40"
            >
              {f.value} <ChevronDown className="h-4 w-4 text-muted" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowFilters(false)}
          className="rounded-xl bg-forest-deep px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-forest"
        >
          Apply Filters →
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-3 px-5 pb-5">
        {/* Map / list main */}
        {view === 'Map' ? (
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-line">
            <RegenMap
              center={[selected.latitude, selected.longitude]}
              zoom={12}
              className="h-full"
              markers={list.map((l) => ({
                id: l.id,
                lat: l.lat,
                lng: l.lng,
                color: potentialColor[l.potential],
                onClick: () => openLand(l),
              }))}
            >
              {/* category chips */}
              <div className="absolute left-1/2 top-4 z-[400] flex -translate-x-1/2 gap-1 rounded-full border border-line bg-white/95 p-1 shadow-sm backdrop-blur">
                {cats.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      category === c ? 'bg-forest-deep text-white' : 'text-muted'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Filters panel */}
              {showFilters && (
                <div className="absolute left-4 top-16 z-[400] w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <p className="font-serif text-lg font-semibold text-ink">Filters</p>
                    <button onClick={() => setShowFilters(false)}>
                      <X className="h-4 w-4 text-muted" />
                    </button>
                  </div>
                  <div className="max-h-[calc(100vh-22rem)] space-y-4 overflow-y-auto p-4 text-sm">
                    <div>
                      <p className="mb-2 font-semibold text-ink">Land Use</p>
                      {landUseFilters.map((l) => (
                        <label
                          key={l}
                          className="flex cursor-pointer items-center gap-2.5 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={checked.includes(l)}
                            onChange={() => toggleCheck(l)}
                            className="h-4 w-4 accent-forest-mid"
                          />
                          <span className={checked.includes(l) ? 'text-ink' : 'text-muted'}>
                            {l}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-ink">Radius: {radiusKm} km</p>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="w-full accent-terra"
                      />
                      <div className="flex justify-between text-xs text-muted">
                        <span>1 km</span>
                        <span>50 km</span>
                      </div>
                    </div>
                    {['Development Potential', 'Infrastructure Access', 'Terrain & Environment', 'Ownership Type', 'Price Range'].map((s) => (
                      <div key={s} className="border-t border-line pt-3">
                        <button
                          onClick={() => toggleExpand(s)}
                          className="flex w-full items-center justify-between text-ink"
                        >
                          {s}
                          <ChevronDown
                            className={`h-4 w-4 text-muted transition ${expanded.includes(s) ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {expanded.includes(s) && (
                          <p className="mt-2 text-xs text-muted">
                            {s} filtering uses the current map area and available data sources.
                          </p>
                        )}
                      </div>
                    ))}
                    <button onClick={resetFilters} className="text-sm font-medium text-terra">
                      Reset All
                    </button>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 z-[400] rounded-2xl border border-line bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
                <p className="mb-1.5 font-semibold text-ink">Land Opportunities</p>
                {Object.entries(potentialColor).map(([k, c]) => (
                  <div key={k} className="mb-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                    <span className="text-muted">{k} Potential</span>
                  </div>
                ))}
              </div>
            </RegenMap>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 content-start gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {list.map((l) => (
              <LandCard key={l.id} l={l} saved={saved} toggleSaved={toggleSaved} onOpen={() => openLand(l)} big />
            ))}
          </div>
        )}

        {/* Right list */}
        {view === 'Map' && (
          <div className="hidden w-80 shrink-0 flex-col xl:flex">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{list.length} Land Opportunities</p>
              <button
                onClick={() =>
                  setSort((s) => (s === 'Potential' ? 'Acres' : s === 'Acres' ? 'Price' : 'Potential'))
                }
                className="flex items-center gap-1 text-xs text-muted transition hover:text-ink"
              >
                Sort by: {sort} <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {loading && <p className="rounded-xl bg-white p-4 text-sm text-muted">Finding opportunity areas…</p>}
              {error && <p role="alert" className="rounded-xl bg-white p-4 text-sm text-bad">{error}</p>}
              {!loading && !error && list.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-muted">No opportunity areas were found near this location. Try increasing the search radius.</p>}
              {list.map((l) => (
                <LandCard key={l.id} l={l} saved={saved} toggleSaved={toggleSaved} onOpen={() => openLand(l)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LandCard({
  l,
  saved,
  toggleSaved,
  onOpen,
  big,
}: {
  l: LandOpportunity;
  saved: string[];
  toggleSaved: (id: string) => void;
  onOpen: () => void;
  big?: boolean;
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex w-full gap-3 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-terra/40 hover:shadow-md"
    >
      <img
        src={l.image}
        alt={l.location}
        className={`rounded-xl object-cover ${big ? 'h-24 w-28' : 'h-20 w-24'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <PotentialBadge level={l.potential} />
          <Bookmark
            onClick={(e) => {
              e.stopPropagation();
              toggleSaved(l.id);
            }}
            className={`h-4 w-4 ${saved.includes(l.id) ? 'fill-terra text-terra' : 'text-muted'}`}
          />
        </div>
        <p className="mt-1.5 font-serif text-lg font-semibold text-ink">{l.acres} Acres</p>
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3 w-3" /> {l.location}
        </p>
        <p className="mt-0.5 font-semibold text-terra">{l.price}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {l.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[11px] text-muted">
              · {t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
