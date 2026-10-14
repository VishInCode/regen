import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Search,
  X,
  MapPin,
  Layers,
  Ruler,
  PenLine,
  Bookmark,
  Loader2,
  Camera,
  ChevronDown,
  BarChart2,
} from 'lucide-react';
import RegenMap from '../components/RegenMap';
import StreetViewPanel from '../components/StreetViewPanel';
import { useLocationStore } from '../lib/location-store';
import { useLocationSearch } from '../lib/hooks/useLocationSearch';
import { fetchPois } from '../lib/api/places';
import type { POI, POICategory } from '../lib/api/types';
import { CATEGORY_STYLE, categoriesForZoom } from '../lib/map/poiStyle';
import { reverseGeocode } from '../lib/api/geocoding';
import { pathLength, polygonArea, polygonPerimeter, formatArea, formatDistance } from '../lib/map/geometry';
import type { Location } from '../data/types';

const PLACE_LAYERS: { id: POICategory; label: string }[] = [
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
  { id: 'government', label: 'Government' },
  { id: 'retail', label: 'Retail & Markets' },
  { id: 'food', label: 'Food & Hospitality' },
  { id: 'finance', label: 'Finance' },
  { id: 'recreation', label: 'Recreation' },
  { id: 'transport', label: 'Transport' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'agriculture', label: 'Agriculture' },
];

const LAYER_GROUPS: { name: string; categories: POICategory[]; unavailable?: string }[] = [
  { name: 'People', categories: [], unavailable: 'Population data is not provided by the places endpoint.' },
  { name: 'Infrastructure', categories: ['transport'], unavailable: 'Road geometry and utility markers are not included in this response.' },
  { name: 'Services', categories: ['healthcare', 'education', 'government'] },
  { name: 'Business', categories: ['retail', 'food', 'finance', 'other'] },
  { name: 'Land', categories: ['agriculture', 'industrial', 'recreation'], unavailable: 'Only mapped land-use features returned by the API can appear here.' },
  { name: 'Future', categories: [], unavailable: 'No planned development source is connected.' },
];

export default function ExploreMap() {
  const navigate = useNavigate();
  const {
    selected,
    locationExplicit,
    setSelected,
    saved,
    toggleSaved,
    activeLayers,
    toggleLayer,
    setActiveLayers,
    analysisRadius,
    mapZoom,
    setMapZoom,
  } = useLocationStore();

  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [searchOpen, setSearchOpen] = useState(Boolean(params.get('q')));
  const [layersOpen, setLayersOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'measure' | 'draw' | null>(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const [measurePts, setMeasurePts] = useState<{ lat: number; lng: number }[]>([]);
  const [drawPts, setDrawPts] = useState<{ lat: number; lng: number }[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [placesState, setPlacesState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [loadedPlacesKey, setLoadedPlacesKey] = useState('');
  const placesKey = `${selected.id}:${selected.latitude}:${selected.longitude}:${analysisRadius}`;
  const loading = loadedPlacesKey !== placesKey;
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdowns when clicking outside
  const layersBtnRef = useRef<HTMLDivElement>(null);
  const locBtnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (layersBtnRef.current && !layersBtnRef.current.contains(e.target as Node)) setLayersOpen(false);
      if (locBtnRef.current && !locBtnRef.current.contains(e.target as Node)) setLocOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { results, loading: searching } = useLocationSearch(query);
  const activePlaceLayers = activeLayers.filter((l): l is POICategory =>
    PLACE_LAYERS.some((p) => p.id === l),
  );

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchPois({
      lat: selected.latitude,
      lng: selected.longitude,
      radius: analysisRadius,
      categories: PLACE_LAYERS.map((layer) => layer.id),
      signal: controller.signal,
    })
      .then(({ pois }) => { setPois(pois); setPlacesState(pois.length ? 'ready' : 'empty'); setLoadedPlacesKey(placesKey); })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setPois([]);
          setPlacesState('error');
          setLoadedPlacesKey(placesKey);
        }
      });
    return () => controller.abort();
  }, [placesKey, selected.latitude, selected.longitude, analysisRadius]);

  const visiblePois = (loadedPlacesKey === placesKey ? pois : []).filter((p) =>
    categoriesForZoom(mapZoom, activePlaceLayers).includes(p.category),
  );

  const counts = PLACE_LAYERS.map((l) => ({
    ...l,
    count: pois.filter((p) => p.category === l.id).length,
  }));

  const activeCount = activePlaceLayers.reduce((n, id) => n + pois.filter((p) => p.category === id).length, 0);

  const choose = (l: Location) => {
    setSelected(l, { explicit: true });
    setQuery('');
    setSearchOpen(false);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (activeTool === 'measure') { setMeasurePts((p) => [...p, { lat, lng }]); return; }
    if (activeTool === 'draw') { setDrawPts((p) => [...p, { lat, lng }]); return; }
    const loc = await reverseGeocode(lat, lng);
    setSelected(loc, { explicit: true });
  };

  const toggleTool = (tool: 'measure' | 'draw') =>
    setActiveTool((a) => (a === tool ? null : tool));

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="z-[200] flex shrink-0 items-stretch gap-1 border-b border-line bg-white px-2 py-1.5 shadow-sm">

        {/* Location pill + dropdown */}
        <div ref={locBtnRef} className="relative">
          <button
            onClick={() => { setLocOpen((v) => !v); setLayersOpen(false); setSearchOpen(false); }}
            className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
              locOpen ? 'border-forest-deep bg-forest-deep text-white' : 'border-line bg-canvas-soft text-ink hover:bg-canvas'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="max-w-[140px] truncate">{selected.name}</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin opacity-60" />}
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${locOpen ? 'rotate-180' : ''}`} />
          </button>

          {locOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-deep text-white">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-base font-semibold text-ink">{selected.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[selected.city, selected.state].filter(Boolean).join(', ') || 'Selected point'}
                  </p>
                  <p className="text-[10px] text-muted">
                    {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                  </p>
                </div>
                <button onClick={() => toggleSaved(selected.id)} title="Bookmark">
                  <Bookmark
                    className={`h-4 w-4 ${saved.includes(selected.id) ? 'fill-terra text-terra' : 'text-muted hover:text-ink'}`}
                  />
                </button>
              </div>

              {/* POI summary */}
              {activePlaceLayers.length > 0 && (
                <div className="border-t border-line px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {counts.filter((c) => activePlaceLayers.includes(c.id)).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ background: CATEGORY_STYLE[c.id].color }}>
                            {CATEGORY_STYLE[c.id].glyph}
                          </span>
                          <span className="text-xs text-muted">{c.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-ink">{loading ? '…' : c.count}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-muted">
                    Within {(analysisRadius / 1000).toFixed(0)} km · {placesState === 'ready' ? 'OpenStreetMap' : placesState === 'error' ? 'Data unavailable' : 'Places'}
                  </p>
                </div>
              )}

              <button
                onClick={() => { setLocOpen(false); navigate('/analyze'); }}
                className="flex w-full items-center justify-center gap-2 bg-forest-deep py-2.5 text-sm font-semibold text-white transition hover:bg-forest"
              >
                <BarChart2 className="h-4 w-4" />
                Analyze Area
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <div className={`flex h-9 items-center gap-2 rounded-lg border px-3 transition ${
            searchOpen ? 'border-forest-mid bg-white shadow-sm' : 'border-line bg-canvas-soft'
          }`}>
            <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); setLocOpen(false); setLayersOpen(false); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Search city, area, coordinates…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
            {searching
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
              : query
                ? <button onMouseDown={() => setQuery('')}><X className="h-3.5 w-3.5 text-muted" /></button>
                : null
            }
          </div>

          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
              {!searching && results.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted">No matching locations.</p>
              )}
              {results.map((l) => (
                <button
                  key={l.id}
                  onMouseDown={() => choose(l)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas-soft"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-terra" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{l.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {l.displayName ?? [l.city, l.state, l.country].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1 w-px self-stretch bg-line" />

        {/* Layers dropdown */}
        <div ref={layersBtnRef} className="relative">
          <button
            onClick={() => { setLayersOpen((v) => !v); setLocOpen(false); setSearchOpen(false); }}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
              layersOpen ? 'border-forest-deep bg-forest-deep text-white' : 'border-line bg-canvas-soft text-ink hover:bg-canvas'
            }`}
          >
            <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Layers</span>
            {activePlaceLayers.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                layersOpen ? 'bg-white/20 text-white' : 'bg-forest-deep/10 text-forest-mid'
              }`}>
                {activePlaceLayers.length}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${layersOpen ? 'rotate-180' : ''}`} />
          </button>

          {layersOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="font-serif text-base font-semibold text-ink">Data Layers</p>
                <span className="text-xs text-muted">{activeCount} places shown</span>
              </div>
              <div className="max-h-[65vh] overflow-y-auto">
                <div className="p-3">
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                    Institutions & Places
                  </p>
                  {LAYER_GROUPS.map((group) => (
                    <section key={group.name} className="mt-2">
                    <div className="mb-1 flex items-center gap-2 px-2 pt-2">
                      {group.categories.length > 0 && <input
                        type="checkbox"
                        aria-label={`Toggle ${group.name} layer group`}
                        checked={group.categories.every((id) => activeLayers.includes(id))}
                        onChange={() => {
                          const enabled = group.categories.every((id) => activeLayers.includes(id));
                          const next = activeLayers.filter((id) => !group.categories.includes(id as POICategory));
                          setActiveLayers(enabled ? next : [...next, ...group.categories]);
                        }}
                        className="h-3.5 w-3.5 accent-forest-mid"
                      />}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{group.name}</p>
                    </div>
                    {group.categories.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-muted">{group.unavailable}</p>
                    ) : counts.filter((layer) => group.categories.includes(layer.id)).map((l) => (
                    <label
                      key={l.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition hover:bg-canvas-soft"
                    >
                      <input
                        type="checkbox"
                        checked={activeLayers.includes(l.id)}
                        onChange={() => toggleLayer(l.id)}
                        className="h-4 w-4 accent-forest-mid"
                      />
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: CATEGORY_STYLE[l.id].color }}
                      >
                        {CATEGORY_STYLE[l.id].glyph}
                      </span>
                      <span className={`flex-1 ${activeLayers.includes(l.id) ? 'text-ink' : 'text-muted'}`}>
                        {l.label}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {activeLayers.includes(l.id) ? (loading ? '…' : l.count) : ''}
                      </span>
                    </label>
                    ))}
                    {group.categories.length > 0 && group.unavailable && <p className="px-2 pb-1 text-[10px] text-muted">{group.unavailable}</p>}
                    </section>
                  ))}

                  <p className="mt-3 rounded-lg bg-canvas-soft px-2 py-2 text-[11px] leading-relaxed text-muted">
                    {loading
                      ? 'Loading nearby place data.'
                    : placesState === 'error'
                      ? 'Map places could not be loaded. Try selecting this location again.'
                      : placesState === 'empty'
                        ? 'No mapped places found in this area.'
                        : 'Place markers come from the live places response. Unknown categories are kept in Other.'}
                    {!locationExplicit && <span className="block pt-1">Dehradun is the default development location.</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Measure toggle */}
        <button
          onClick={() => toggleTool('measure')}
          title="Measure distance — click points on the map"
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
            activeTool === 'measure'
              ? 'border-[#B85F35] bg-[#B85F35] text-white'
              : 'border-line bg-canvas-soft text-ink hover:bg-canvas'
          }`}
        >
          <Ruler className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Measure</span>
        </button>

        {/* Draw toggle */}
        <button
          onClick={() => toggleTool('draw')}
          title="Draw an area — click to add polygon vertices"
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
            activeTool === 'draw'
              ? 'border-good bg-good text-white'
              : 'border-line bg-canvas-soft text-ink hover:bg-canvas'
          }`}
        >
          <PenLine className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Draw</span>
        </button>

        {/* Street View toggle */}
        <button
          onClick={() => setShowStreetView((v) => !v)}
          title="Street View"
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
            showStreetView
              ? 'border-navy bg-navy text-white'
              : 'border-line bg-canvas-soft text-ink hover:bg-canvas'
          }`}
        >
          <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Street View</span>
        </button>
      </div>

      {/* ── Active tool status strip ─────────────────────────────────────── */}
      {activeTool && (
        <div className={`z-[100] flex shrink-0 items-center gap-4 px-4 py-2 text-sm ${
          activeTool === 'measure' ? 'bg-[#B85F35]/10 border-b border-[#B85F35]/20' : 'bg-good/10 border-b border-good/20'
        }`}>
          {activeTool === 'measure' ? (
            <>
              <Ruler className="h-3.5 w-3.5 text-[#B85F35]" strokeWidth={2} />
              <span className="font-medium text-[#B85F35]">Measuring</span>
              <span className="text-muted">{measurePts.length} pts</span>
              {measurePts.length >= 2 && (
                <span className="font-semibold text-ink">{formatDistance(pathLength(measurePts))}</span>
              )}
              <span className="text-xs text-muted">Click the map to add points</span>
            </>
          ) : (
            <>
              <PenLine className="h-3.5 w-3.5 text-good" strokeWidth={2} />
              <span className="font-medium text-good">Drawing</span>
              <span className="text-muted">{drawPts.length} vertices</span>
              {drawPts.length >= 3 && (
                <span className="font-semibold text-ink">{formatArea(polygonArea(drawPts))}</span>
              )}
              {drawPts.length >= 2 && (
                <span className="font-semibold text-ink">{formatDistance(polygonPerimeter(drawPts))}</span>
              )}
              <span className="text-xs text-muted">Click the map to add vertices</span>
            </>
          )}
          <button
            onClick={() => activeTool === 'measure' ? setMeasurePts([]) : setDrawPts([])}
            className="rounded px-2 py-0.5 text-xs font-medium text-muted underline hover:text-ink"
          >
            Clear
          </button>
          <button
            onClick={() => setActiveTool(null)}
            className="ml-auto rounded-full p-0.5 text-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Map + Street View ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <RegenMap
          center={[selected.latitude, selected.longitude]}
          zoom={mapZoom}
          satellite={false}
          className={`h-full transition-all duration-300 ${showStreetView ? 'w-[58%]' : 'w-full'}`}
          pois={visiblePois}
          loading={loading}
          radiusCircle={{ center: [selected.latitude, selected.longitude], radius: analysisRadius }}
          onZoomChange={setMapZoom}
          onMapClick={handleMapClick}
          paths={[
            ...(measurePts.length >= 2
              ? [{ id: 'measure', points: measurePts, color: '#B85F35', dashed: true }]
              : []),
            ...(drawPts.length >= 2
              ? [{ id: 'draw', points: drawPts, color: '#4f9d69', closed: drawPts.length >= 3 }]
              : []),
          ]}
          vertices={[
            ...measurePts.map((p, i) => ({ id: `m${i}`, lat: p.lat, lng: p.lng, color: '#B85F35' })),
            ...drawPts.map((p, i) => ({ id: `d${i}`, lat: p.lat, lng: p.lng, color: '#4f9d69' })),
          ]}
          markers={[
            { id: selected.id, lat: selected.latitude, lng: selected.longitude, color: '#4f9d69' },
          ]}
        >
          {placesState === 'empty' && <div className="pointer-events-none absolute left-1/2 top-4 z-[1500] -translate-x-1/2 rounded-lg bg-white/95 px-3 py-2 text-xs text-ink shadow">No mapped places found in this area.</div>}
          {placesState === 'error' && <div className="pointer-events-none absolute left-1/2 top-4 z-[1500] -translate-x-1/2 rounded-lg bg-white/95 px-3 py-2 text-xs text-[#B85F35] shadow">Map places could not be loaded.</div>}
        </RegenMap>

        {showStreetView && (
          <div className="h-full w-[42%] shrink-0">
            <StreetViewPanel
              lat={selected.latitude}
              lng={selected.longitude}
              onClose={() => setShowStreetView(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
