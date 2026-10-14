import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Bookmark,
  MapPin,
  Cross,
  GraduationCap,
  Store,
  Landmark,
  Navigation,
  Home as HomeIcon,
  FileText,
  TrendingUp,
  Loader2,
  Info,
} from 'lucide-react';
import { Card, ViewAll, SourceTag, StatusPill } from '../components/ui';
import { useLocationStore } from '../lib/location-store';
import RegenMap from '../components/RegenMap';
import { CATEGORY_STYLE } from '../lib/map/poiStyle';
import type { POI, POICategory } from '../lib/api/types';
import { useLandAnalysis } from '../lib/hooks/useLandAnalysis';
import type { LandAnalysis, LandAnalysisSection } from '../../types/analysis';

const tabs = ['Overview', 'Demographics', 'Infrastructure', 'Services', 'Land Use', 'Environment', 'Development', 'Nearby Places'];

const RADII = [
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
];

const facilityIcon: Partial<Record<POICategory, typeof Cross>> = {
  healthcare: Cross,
  education: GraduationCap,
  government: Landmark,
  retail: Store,
  food: Store,
  transport: Navigation,
};

const actions = [
  { title: 'Real Estate Analysis', body: 'Property trends, land value and suitability for development.', icon: HomeIcon, to: '/find-land' },
  { title: 'Business Analysis', body: 'Explore business opportunities and market potential.', icon: Store, to: '/business' },
  { title: 'Public Planning Analysis', body: 'Analyze for urban and community development.', icon: Landmark, to: '/public' },
  { title: 'General Area Report', body: 'Get a comprehensive report of this area.', icon: FileText, to: '/reports' },
];

export default function AnalyzeLand() {
  const navigate = useNavigate();
  const { selected, saved, toggleSaved, analysisRadius, setAnalysisRadius } = useLocationStore();
  const { analysis, loading, error } = useLandAnalysis(selected, analysisRadius);
  const [tab, setTab] = useState('Overview');
  const pois = analysis ? mapNearbyPlaces(analysis) : [];
  const facilityMix = analysis ? facilityCounts(analysis) : [];
  const facilityTotal = facilityMix.reduce((s, d) => s + d.value, 0);
  const insights = analysis?.keyInsights.data ?? [];
  const overallScore = analysis?.overview.data.scores.overallScore;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pt-1">
      <div className="text-sm text-muted">
        <button onClick={() => navigate('/explore')} className="hover:text-terra">
          Explore Map
        </button>{' '}
        › <span className="text-ink">{selected.name}</span> › Location Analysis
      </div>

      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl bg-forest-deep">
        <img
          src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1400&h=360&fit=crop&auto=format"
          alt="Aerial view of the area"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-deep to-forest-deep/30" />
        <div className="relative flex flex-col justify-between gap-4 p-7 md:flex-row md:items-end">
          <div className="text-white">
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-4xl font-semibold">{selected.name}</h1>
              <button
                onClick={() => toggleSaved(selected.id)}
                className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur"
              >
                <Bookmark className={`h-3.5 w-3.5 ${saved.includes(selected.id) ? 'fill-white' : ''}`} />
                {saved.includes(selected.id) ? 'Saved' : 'Save'}
              </button>
            </div>
            <p className="mt-1 text-white/75">
              {[selected.city, selected.state, selected.country].filter(Boolean).join(', ') ||
                `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-deep">
                Source: {selected.source?.name ?? 'OpenStreetMap'}
              </span>
              {overallScore != null && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-deep">
                  Area score {overallScore}/100
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-end">
            <span className="text-xs text-white/70">Radius</span>
            <div className="flex rounded-full bg-white/15 p-1 backdrop-blur">
              {RADII.map((radius) => (
                <button
                  key={radius.value}
                  onClick={() => setAnalysisRadius(radius.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    analysisRadius === radius.value ? 'bg-white text-forest-deep' : 'text-white/80'
                  }`}
                >
                  {radius.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-deep transition hover:bg-canvas-soft"
            >
              <MapPin className="h-4 w-4" /> Change
            </button>
          </div>
        </div>
      </section>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm transition ${
              tab === t ? 'bg-forest-deep font-semibold text-white' : 'text-muted hover:bg-canvas-soft'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <Card className="p-5 text-sm text-bad">
          {error}
        </Card>
      )}

      {/* Dynamic facility stat row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {facilityMix.slice(0, 6).map((f) => {
          const Icon = facilityIcon[f.category] ?? MapPin;
          return (
            <Card key={f.category} className="p-4">
              <Icon className="h-5 w-5 text-terra" strokeWidth={1.75} />
              <p className="mt-2 font-serif text-2xl font-semibold text-ink">
                {f.count}
              </p>
              <p className="text-xs font-medium text-ink">{f.label}</p>
              <p className="text-xs text-muted">within {(analysisRadius / 1000).toFixed(0)} km</p>
            </Card>
          );
        })}
        {!analysis && loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex h-28 items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </Card>
          ))}
      </div>

      {/* Overview / insights / actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-serif text-2xl font-semibold text-ink">Area Overview</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {analysis
              ? overviewText(analysis, selected.name, analysisRadius)
              : loading ? 'Loading area overview…' : 'Unavailable'}
          </p>
          <div className="mt-3">
            <SourceTag
              source={{ type: 'osm', name: analysis?.dataAvailability.source ?? 'REGEN land analysis' }}
              status="observed"
            />
          </div>
          <RegenMap
            center={[selected.latitude, selected.longitude]}
            zoom={13}
            className="mt-4 h-40 overflow-hidden rounded-xl border border-line"
            pois={pois.slice(0, 60)}
            radiusCircle={{ center: [selected.latitude, selected.longitude], radius: analysisRadius }}
            markers={[{ id: selected.id, lat: selected.latitude, lng: selected.longitude, color: '#4f9d69' }]}
          />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold text-ink">Key Insights</h2>
            <span className="text-[11px] text-muted">AI explanation</span>
          </div>
          {loading && <p className="text-sm text-muted">Loading analysis…</p>}
          {!loading && !analysis && <p className="text-sm text-muted">Unavailable</p>}
          <div className="space-y-3">
            {insights.map((ins) => (
              <div key={ins.text} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-terra/15 text-terra"
                >
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{ins.text}</p>
                    <StatusPill status="estimated" />
                  </div>
                  <p className="text-xs text-muted">{ins.evidence.join(' · ')}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-canvas-soft p-2 text-[11px] text-muted">
            <Info className="h-3.5 w-3.5" /> Insights explain measured data only — no figures are invented.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">What would you like to do?</h2>
          <div className="space-y-2">
            {actions.map((ac) => (
              <button
                key={ac.title}
                onClick={() => navigate(ac.to)}
                className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-terra/40 hover:bg-canvas-soft"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas-soft text-terra">
                  <ac.icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{ac.title}</p>
                  <p className="text-xs text-muted">{ac.body}</p>
                </div>
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra text-white">→</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Factor scores */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-ink">Access & Activity Factors</h3>
          {analysis && <SourceTag source={{ type: 'computed', name: analysis.dataAvailability.source }} status="estimated" />}
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {(analysis?.overview.data.scores.factors ?? []).map((factor) => (
            <p key={factor} className="text-sm text-muted">{factor}</p>
          ))}
          {analysis && scoreEntries(analysis).map(([label, value]) => (
            <div key={label} className="flex justify-between border-t border-line pt-2 text-sm">
              <span className="text-ink">{label}</span>
              <span className="font-semibold text-ink">{value == null ? 'Unavailable' : `${value}/100`}</span>
            </div>
          ))}
          {analysis && analysis.overview.data.scores.unavailable.map((item) => <p key={item} className="text-xs text-muted">Unavailable: {item}</p>)}
          {loading && !analysis && <p className="text-sm text-muted">Loading analysis…</p>}
          {!loading && !analysis && <p className="text-sm text-muted">Unavailable</p>}
        </div>
      </Card>

      {/* Charts + facilities + development */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">Population</h3>
            {analysis?.demographics.data.population != null && <StatusPill status="reported" />}
          </div>
          {analysis?.demographics.data.population != null ? (
            <>
              <p className="font-serif text-3xl font-semibold text-ink">
                {analysis.demographics.data.population.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-xs text-muted">
                Census reference year {analysis.demographics.data.referenceYear ?? 'Unavailable'}
              </p>
            </>
          ) : (
            <div className="flex h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-line text-center">
              <Info className="h-6 w-6 text-muted" />
              <p className="mt-2 text-sm font-medium text-ink">{loading ? 'Loading…' : 'Unavailable'}</p>
              <p className="mt-1 max-w-[15rem] text-xs text-muted">
                Demographic values are not available from the connected Census source.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">Detected Facility Mix</h3>
            {facilityTotal > 0 && <StatusPill status="observed" />}
          </div>
          {facilityMix.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="relative h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={facilityMix} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {facilityMix.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 text-xs">
                {facilityMix.map((d) => (
                  <div key={d.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                      {d.label}
                    </span>
                    <span className="font-semibold text-ink">
                      {Math.round((d.value / facilityTotal) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[128px] items-center justify-center text-sm text-muted">
              {loading ? 'Loading…' : facilityStatusText(analysis, analysisRadius)}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">
            {facilityMix.length ? `${facilityTotal} real mapped facilities grouped by OSM category.` : facilityStatusText(analysis, analysisRadius)}
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">Nearby Facilities</h3>
            <ViewAll label="View All" onClick={() => navigate('/explore')} />
          </div>
          <div className="space-y-2.5">
            {analysis?.nearbyPlaces.data.slice(0, 8).map((place) => (
              <div key={place.id} className="rounded-lg border border-line px-3 py-2">
                <p className="text-sm font-medium text-ink">{place.name}</p>
                <p className="text-xs capitalize text-muted">
                  {humanize(place.category)}
                  {place.distanceMeters != null ? ` · ${formatDistanceMeters(place.distanceMeters)}` : ''}
                </p>
              </div>
            ))}
            {analysis && analysis.nearbyPlaces.data.length > 8 && <p className="text-xs text-muted">+{analysis.nearbyPlaces.data.length - 8} more mapped places</p>}
            {!analysis || analysis.nearbyPlaces.data.length === 0 ? <p className="text-sm text-muted">{loading ? 'Loading…' : facilityStatusText(analysis, analysisRadius)}</p> : null}
            {analysis?.nearbyPlaces.dataAvailability.providers?.overpass?.attribution && (
              <p className="pt-1 text-[10px] text-muted">{analysis.nearbyPlaces.dataAvailability.providers.overpass.attribution}</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">Development</h3>
          </div>
          {!analysis ? <p className="text-sm text-muted">{loading ? 'Loading…' : 'Unavailable'}</p> : analysis.development.data.signals.length
            ? <ul className="space-y-2">{analysis.development.data.signals.map((signal) => <li key={signal} className="rounded-lg border border-line p-2.5 text-xs text-ink">{signal}</li>)}</ul>
            : <p className="rounded-lg bg-canvas-soft p-3 text-xs text-muted">{analysis.development.dataAvailability.errors?.[0] ? `Overpass error: ${analysis.development.dataAvailability.errors[0]}` : developmentUnavailable(analysis) ? 'Unavailable' : 'No development signals were returned.'}</p>}
        </Card>
      </div>

      {analysis && tab !== 'Overview' && (
        <Card className="p-5">
          <h2 className="font-serif text-2xl font-semibold text-ink">{tab}</h2>
          <p className="mt-1 text-xs text-muted">{tabAvailability(analysis, tab)}</p>
          {['Infrastructure', 'Services', 'Land Use', 'Nearby Places'].includes(tab) && analysis.nearbyPlaces.dataAvailability.providers?.overpass?.attribution && (
            <p className="mt-1 text-[11px] text-muted">Source attribution: {analysis.nearbyPlaces.dataAvailability.providers.overpass.attribution}</p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tabDetails(analysis, tab, analysisRadius).map((item) => (
              <div key={item.label} className="rounded-xl border border-line p-3">
                <p className="text-xs text-muted">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function mapNearbyPlaces(analysis: LandAnalysis): POI[] {
  return analysis.nearbyPlaces.data.map((place) => {
    const category = mapFacilityCategory(place.category);
    return {
      id: place.id,
      name: place.name,
      category,
      subtype: place.category,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      source: { type: 'osm', name: 'OpenStreetMap' },
    };
  });
}

function mapFacilityCategory(value: string): POICategory {
  const raw = value.toLowerCase();
  return ['hospital', 'clinic', 'healthcare', 'pharmacy', 'doctors'].includes(raw) ? 'healthcare'
      : ['school', 'college', 'university'].includes(raw) ? 'education'
      : ['police', 'fire_station', 'government', 'townhall'].includes(raw) ? 'government'
      : ['restaurant', 'cafe', 'food'].includes(raw) ? 'food'
      : ['retail', 'shop', 'marketplace'].includes(raw) ? 'retail'
      : ['transport', 'bus_station', 'railway', 'fuel'].includes(raw) ? 'transport'
      : ['bank', 'atm', 'finance'].includes(raw) ? 'finance'
      : ['recreation', 'leisure'].includes(raw) ? 'recreation'
      : ['industrial'].includes(raw) ? 'industrial'
      : ['agriculture', 'agricultural'].includes(raw) ? 'agriculture'
      : 'other';
}

function facilityCounts(analysis: LandAnalysis) {
  const counts = new Map<string, number>();
  for (const place of analysis.nearbyPlaces.data) counts.set(place.category, (counts.get(place.category) ?? 0) + 1);
  return [...counts.entries()].map(([rawCategory, count]) => {
    const category = mapFacilityCategory(rawCategory);
    return {
    key: rawCategory,
    category,
    count,
    value: count,
    label: humanize(rawCategory),
    color: CATEGORY_STYLE[category].color,
  };
  });
}

function overviewText(analysis: LandAnalysis, name: string, radius: number): string {
  const overpass = analysis.nearbyPlaces.dataAvailability.providers?.overpass;
  if (overpass?.status === 'error') {
    return `OpenStreetMap nearby places could not be loaded (${overpass.message ?? 'provider error'}). Other available location, weather, elevation, and accessibility data remain available.`;
  }
  if (overpass?.status === 'unavailable') {
    return `Nearby OpenStreetMap places are unavailable for this location. Other available provider data remains below.`;
  }
  const placeCount = analysis.nearbyPlaces.data.length;
  const score = analysis.overview.data.scores.overallScore;
  const scoreText = score == null ? 'The combined area score is unavailable.' : `The area score is ${score}/100.`;
  const placesText = placeCount ? `${placeCount} mapped places` : `No mapped facilities found within ${(radius / 1000).toFixed(0)} km`;
  const landUseText = analysis.landUse.data.featureCount
    ? `${analysis.landUse.data.featureCount} observed land-use features`
    : 'No observed land-use features';
  return `Within ${(radius / 1000).toFixed(0)} km of ${name}: ${placesText} and ${landUseText}. ${scoreText}`;
}

function facilityStatusText(analysis: LandAnalysis | null, radius: number): string {
  if (!analysis) return 'Nearby facilities are unavailable.';
  const overpass = analysis.nearbyPlaces.dataAvailability.providers?.overpass;
  if (overpass?.status === 'error') return `Overpass error: ${overpass.message ?? 'request failed'}`;
  if (overpass?.status === 'unavailable') return 'Nearby facilities are unavailable from the configured Overpass source.';
  return `No mapped facilities found within ${(radius / 1000).toFixed(0)} km.`;
}

function formatDistanceMeters(distanceMeters: number): string {
  return distanceMeters >= 1_000
    ? `${(distanceMeters / 1_000).toFixed(1)} km`
    : `${Math.round(distanceMeters)} m`;
}

function scoreEntries(analysis: LandAnalysis): [string, number | null][] {
  const scores = analysis.overview.data.scores;
  return [
    ['Development potential', scores.developmentPotentialScore],
    ['Infrastructure', scores.infrastructureScore],
    ['Accessibility', scores.accessibilityScore],
    ['Overall', scores.overallScore],
  ];
}

function sectionUnavailable(section: LandAnalysisSection<unknown>): boolean {
  return section.dataAvailability.available.length === 0 &&
    Object.values(section.dataAvailability.fields ?? {}).every((status) => status === 'unavailable');
}

function tabSection(analysis: LandAnalysis, tab: string): LandAnalysisSection<unknown> | null {
  switch (tab) {
    case 'Demographics': return analysis.demographics;
    case 'Infrastructure': return analysis.infrastructure;
    case 'Services': return analysis.services;
    case 'Land Use': return analysis.landUse;
    case 'Environment': return analysis.environment;
    case 'Development': return analysis.development;
    case 'Nearby Places': return analysis.nearbyPlaces;
    default: return null;
  }
}

function tabAvailability(analysis: LandAnalysis, tab: string): string {
  const section = tabSection(analysis, tab);
  if (!section) return 'No section data is available.';
  const providerError = section.dataAvailability.errors?.[0];
  if (providerError && tab === 'Infrastructure' && analysis.infrastructure.data.measuredAccessibility) {
    return `Partial data: ORS accessibility is available; Overpass failed (${providerError}), so road observations are unavailable.`;
  }
  if (providerError) return `Provider error: ${providerError}`;
  if (tab === 'Infrastructure' && analysis.infrastructure.data.measuredAccessibility) {
    return 'Partial data available: an ORS driving isochrone is available; road quality metrics are unavailable.';
  }
  if (tab === 'Development' && developmentUnavailable(analysis)) return 'Unavailable from connected data sources.';
  if (sectionUnavailable(section)) return 'Unavailable from connected data sources.';
  if (Object.values(section.dataAvailability.fields ?? {}).includes('no_data')) {
    return tab === 'Land Use' ? 'No mapped land-use observations were returned.'
      : tab === 'Services' || tab === 'Nearby Places' ? 'No mapped facilities found in this area.'
      : 'The provider returned no matching observations.';
  }
  return section.dataAvailability.available.length
    ? `Available: ${section.dataAvailability.available.join(', ')}`
    : 'Partial data available; some fields are unavailable.';
}

function developmentUnavailable(analysis: LandAnalysis): boolean {
  const overpassStatus = analysis.development.dataAvailability.providers?.overpass?.status;
  return overpassStatus === 'error' || overpassStatus === 'unavailable';
}

function displayValue(value: string | number | boolean | null | undefined, suffix = ''): string {
  if (value == null || value === '') return 'Unavailable';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return `${value}${suffix}`;
}

function tabDetails(analysis: LandAnalysis, tab: string, radiusMeters: number): { label: string; value: string }[] {
  switch (tab) {
    case 'Demographics': {
      const d = analysis.demographics.data;
      return [
        { label: 'Population', value: displayValue(d.population?.toLocaleString('en-IN')) },
        { label: 'Households', value: displayValue(d.households?.toLocaleString('en-IN')) },
        { label: 'Urban population', value: displayValue(d.urbanPopulation?.toLocaleString('en-IN')) },
        { label: 'Rural population', value: displayValue(d.ruralPopulation?.toLocaleString('en-IN')) },
        { label: 'Population growth', value: displayValue(d.populationGrowth, '%') },
        { label: 'Reference year', value: displayValue(d.referenceYear) },
      ];
    }
    case 'Infrastructure': {
      const i = analysis.infrastructure.data;
      return [
        { label: 'OSM highway features (not distinct roads)', value: displayValue(i.roadFeatureCount) },
        { label: 'Road connectivity score', value: displayValue(i.roadConnectivityScore, '/100') },
        { label: 'Transport score', value: displayValue(i.transportScore, '/100') },
        { label: 'Accessibility window', value: i.measuredAccessibility ? `${Math.round(i.measuredAccessibility.durationSeconds / 60)} min` : 'Unavailable' },
        { label: 'Reachable area', value: displayValue(i.measuredAccessibility?.reachableAreaSquareMeters, ' m²') },
      ];
    }
    case 'Services': {
      const s = analysis.services.data;
      return Object.entries(s).map(([key, value]) => ({
        label: humanize(key),
        value: value === 0 && analysis.services.dataAvailability.fields?.[key] === 'no_data'
          ? '0 — no mapped features'
          : displayValue(value),
      }));
    }
    case 'Land Use': {
      const l = analysis.landUse.data;
      const providerError = analysis.landUse.dataAvailability.errors?.[0];
      const noObservedData = !providerError && analysis.landUse.dataAvailability.fields?.landUse === 'no_data';
      return [
        { label: 'Observed features', value: providerError ? 'Unavailable (provider error)' : noObservedData ? 'No observed features' : displayValue(l.featureCount) },
        { label: 'Categories', value: l.observedCategories.length ? l.observedCategories.join(', ') : noObservedData ? 'No observed land-use features' : 'Unavailable' },
        { label: 'Estimated area', value: displayValue(l.estimatedAreaSqMeters, ' m²') },
        ...Object.entries(l.observedTagCounts).map(([key, value]) => ({ label: humanize(key), value: displayValue(value) })),
      ];
    }
    case 'Environment': {
      const e = analysis.environment.data;
      return [
        { label: 'Temperature', value: displayValue(e.temperatureCelsius, ' °C') },
        { label: 'Precipitation', value: displayValue(e.precipitationMillimeters, ' mm') },
        { label: 'Weather code', value: displayValue(e.weatherCode) },
        { label: 'Elevation', value: displayValue(e.elevationMeters, ' m') },
        { label: 'Terrain', value: displayValue(e.terrain) },
        { label: 'Air quality index', value: displayValue(e.airQualityIndex) },
      ];
    }
    case 'Development': {
      const d = analysis.development.data;
      return [
        { label: 'Development potential score', value: displayValue(d.developmentPotentialScore, '/100') },
        { label: 'Observed land-use features', value: displayValue(d.observedFeatures.length) },
        ...d.signals.map((signal, index) => ({ label: `Signal ${index + 1}`, value: signal })),
      ];
    }
    case 'Nearby Places': {
      if (analysis.nearbyPlaces.data.length) {
        return analysis.nearbyPlaces.data.map((place) => ({
          label: place.name,
          value: `${humanize(place.category)}${place.distanceMeters != null ? ` · ${formatDistanceMeters(place.distanceMeters)}` : ''}`,
        }));
      }
      return [{ label: 'Nearby facilities', value: facilityStatusText(analysis, radiusMeters) }];
    }
    default:
      return [];
  }
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
