import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  Bookmark,
  Download,
  Users2,
  Store,
  Footprints,
  Building2,
  Bus,
  GraduationCap,
  HeartPulse,
  MapPinOff,
} from 'lucide-react';
import RegenMap from '../components/RegenMap';
import { Card, Meter, StatusPill } from '../components/ui';
import { useLocationStore } from '../lib/location-store';
import { useLocationAnalysis } from '../lib/hooks/useLocationAnalysis';
import { BUSINESS_PROFILES } from '../lib/analysis/businessScore';
import type { BusinessAnalysis, BusinessAnalysisRequest } from '@/types/business';

const scoreColor = (s: number) =>
  s >= 70 ? 'bg-good/15 text-good' : s >= 45 ? 'bg-warn/15 text-[#b07d1e]' : 'bg-terra/15 text-terra';

const barColor = (v: number) => (v >= 66 ? '#4f9d69' : v >= 40 ? '#e0a53f' : '#cf5b4a');

export default function BusinessResults() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [savedRouteState] = useState<Partial<BusinessAnalysisRequest> & { locationName?: string }>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(sessionStorage.getItem('regen.businessRequest') ?? '{}') as Partial<BusinessAnalysisRequest> & { locationName?: string };
    } catch {
      return {};
    }
  });
  const routeState = (routeLocation.state ?? savedRouteState) as Partial<BusinessAnalysisRequest> & { locationName?: string };
  const { selected, locationExplicit, analysisRadius, saved, toggleSaved, saveLocation } = useLocationStore();
  const profile = BUSINESS_PROFILES[routeState.businessType ?? 'food-beverage'] ?? BUSINESS_PROFILES['food-beverage'];

  const { analysis } = useLocationAnalysis(locationExplicit ? selected : null, analysisRadius);
  const [businessAnalysis, setBusinessAnalysis] = useState<BusinessAnalysis | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState('');

  useEffect(() => {
    if (!locationExplicit) return;
    const controller = new AbortController();
    setBusinessLoading(true);
    setBusinessAnalysis(null);
    setBusinessError('');
    const request: BusinessAnalysisRequest = {
      businessType: routeState.businessType ?? 'food-beverage',
      targetCustomers: routeState.targetCustomers ?? ['General Public'],
      expectedInvestment: routeState.expectedInvestment ?? 0,
      expectedMonthlyRevenue: routeState.expectedMonthlyRevenue ?? 0,
      businessSize: routeState.businessSize ?? 'small',
      location: { latitude: selected.latitude, longitude: selected.longitude },
      locationName: selected.name,
      searchRadiusKm: routeState.searchRadiusKm ?? analysisRadius / 1_000,
    };
    fetch('/api/business-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Business analysis could not be completed.');
        setBusinessAnalysis(payload as BusinessAnalysis);
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setBusinessError((error as Error).message);
      })
      .finally(() => { if (!controller.signal.aborted) setBusinessLoading(false); });
    return () => controller.abort();
  }, [
    locationExplicit,
    selected.latitude,
    selected.longitude,
    selected.name,
    analysisRadius,
    routeState.businessType,
    routeState.businessSize,
    routeState.expectedInvestment,
    routeState.expectedMonthlyRevenue,
    routeState.searchRadiusKm,
    routeState.targetCustomers?.join(','),
  ]);

  if (!locationExplicit) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
        <MapPinOff className="h-10 w-10 text-muted" />
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">No location selected</h1>
        <p className="mt-2 text-sm text-muted">
          Choose a location in Business Planning to generate an opportunity analysis.
        </p>
        <button
          onClick={() => navigate('/business')}
          className="mt-5 rounded-xl bg-forest-deep px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest"
        >
          ← Back to Business Planning
        </button>
      </div>
    );
  }

  const candidate = businessAnalysis?.candidateLocations[0] ?? null;
  const score = candidate?.opportunityScore ?? null;
  const isDemo = businessAnalysis?.dataAvailability.isMock ?? false;
  const signals = candidate?.nearbySignals ?? null;
  const count = (cat: string): number | null => {
    if (!signals) return null;
    const mapping: Record<string, keyof NonNullable<typeof signals>> = {
      retail: 'retail', food: 'food', transport: 'transport', healthcare: 'healthcare',
      education: 'education', government: 'government', recreation: 'recreation', industrial: 'industrialAreas',
    };
    return signals[mapping[cat] ?? 'retail'];
  };
  const factorDefinitions = [
    { factor: 'Local demand', value: candidate?.demandScore, explanation: isDemo ? 'Simulated nearby activity is used as a demand proxy.' : 'Nearby food and retail venues are used as a mapped activity proxy.' },
    { factor: 'Competition', value: candidate?.competitionScore, explanation: isDemo ? 'Simulated same-category activity informs this competition scenario.' : 'Mapped venues in the same category inform this competition proxy.' },
    { factor: 'Accessibility', value: candidate?.accessibilityScore, explanation: isDemo ? 'Simulated transport and road signals inform this access scenario.' : 'Based on mapped transport stops and road features in this search radius.' },
    { factor: 'Infrastructure', value: candidate?.infrastructureScore, explanation: isDemo ? 'Simulated amenities inform this infrastructure scenario.' : 'Based on mapped healthcare, education, finance, government and recreation amenities.' },
  ].filter((item): item is { factor: string; value: number; explanation: string } => typeof item.value === 'number');

  const downloadReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      businessType: profile.label,
      location: {
        name: selected.name,
        latitude: selected.latitude,
        longitude: selected.longitude,
        source: selected.source?.name ?? 'OpenStreetMap',
      },
      radiusMeters: analysisRadius,
      dataAvailability: businessAnalysis?.dataAvailability ?? 'unavailable',
      analysisExplanation: businessAnalysis?.explanation ?? (businessError || 'Analysis is still loading.'),
      overallScore: score,
      factors: factorDefinitions,
      nearbySignals: signals,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regen-${profile.id}-${selected.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insights = [
    { icon: Store, label: 'Commercial venues', value: count('retail') === null || count('food') === null ? null : count('retail')! + count('food')! },
    { icon: Bus, label: 'Transport nodes', value: count('transport') },
    { icon: HeartPulse, label: 'Healthcare', value: count('healthcare') },
    { icon: GraduationCap, label: 'Education', value: count('education') },
    { icon: Building2, label: 'Government', value: count('government') },
    { icon: Footprints, label: `Similar (${profile.competitionCategory})`, value: count(profile.competitionCategory) },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pt-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Business Planning › Results</p>
          <div className="flex items-center gap-3">
            <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">Business Opportunity Analysis</h1>
            <span className={`mt-1 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isDemo ? 'bg-warn/15 text-[#8a641e]' : 'bg-good/15 text-good'}`}>
              {businessLoading ? 'Analyzing' : businessError || score === null ? 'Data unavailable' : isDemo ? 'Demo simulation' : <><CheckCircle2 className="h-3.5 w-3.5" /> Live location data</>}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {profile.label} suitability for <span className="font-medium text-ink">{selected.name}</span> within{' '}
            {(analysisRadius / 1000).toFixed(0)} km.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toggleSaved(selected.id);
              saveLocation(selected);
            }}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas-soft"
          >
            <Bookmark className={`h-4 w-4 ${saved.includes(selected.id) ? 'fill-terra text-terra' : ''}`} />
            {saved.includes(selected.id) ? 'Saved' : 'Save Analysis'}
          </button>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 rounded-xl bg-forest-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest"
          >
            <Download className="h-4 w-4" /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Score + map */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm text-muted">Location Opportunity Score</p>
            <div className="mt-1 flex items-end gap-3">
              <span
                className={`rounded-xl px-3 py-1 font-serif text-3xl font-semibold ${
                  score !== null ? scoreColor(score) : 'bg-canvas-soft text-muted'
                }`}
              >
                {businessLoading ? '…' : score === null ? '—' : `${score}/100`}
              </span>
              {score !== null && <StatusPill status="estimated" />}
            </div>
            <p className="mt-2 text-xs text-muted">
              {businessAnalysis?.explanation ?? businessError ?? 'Uses nearby amenities as comparative proxies; it is not a sales or profit forecast.'}
            </p>
            {isDemo && <p className="mt-2 rounded-lg bg-warn/10 px-3 py-2 text-xs font-semibold text-[#8a641e]">DEMO MODE — nearby counts and score are simulated for presentation. They are not verified places or market research.</p>}
            {!businessLoading && score === null && <p className="mt-2 text-xs font-medium text-terra">No score is available for this location.</p>}
            {businessAnalysis?.dataAvailability.errors?.map((error, index) => (
              <p key={`${index}-${error}`} className="mt-1 text-xs text-muted">Data provider: {error}</p>
            ))}
          </Card>

          <div className="overflow-hidden rounded-2xl border border-line">
            <RegenMap
              center={[selected.latitude, selected.longitude]}
              zoom={13}
              className="h-full min-h-[280px]"
              pois={analysis?.pois.slice(0, 60) ?? []}
              radiusCircle={{ center: [selected.latitude, selected.longitude], radius: analysisRadius }}
              markers={[{ id: selected.id, lat: selected.latitude, lng: selected.longitude, color: '#4f9d69' }]}
            />
          </div>
        </div>

        {/* Factor breakdown */}
        <Card className="p-5">
          <h3 className="mb-1 font-serif text-xl font-semibold text-ink">Score Breakdown</h3>
          <p className="mb-3 text-xs text-muted">Each factor is explained — no unexplained scores.</p>
          <div className="space-y-3.5">
            {factorDefinitions.map((f) => (
              <div key={f.factor}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{f.factor}</span>
                  <span className="font-semibold text-ink">{f.value}/100</span>
                </div>
                <Meter value={f.value} max={100} />
                <p className="mt-1 text-xs text-muted">{f.explanation}</p>
              </div>
            ))}
            {businessLoading && <p className="text-sm text-muted">Loading location-specific data…</p>}
            {!businessLoading && factorDefinitions.length === 0 && <p className="text-sm text-muted">No factor scores are available for this location.</p>}
          </div>
        </Card>

        {/* Insights */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-ink">Area Insights</h3>
            <span className="text-xs text-muted">{businessAnalysis?.dataAvailability.source ?? (businessLoading ? 'Loading' : 'Unavailable')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {insights.map((k) => (
              <div key={k.label} className="rounded-xl border border-line p-3">
                <k.icon className="h-4 w-4 text-terra" strokeWidth={1.75} />
                <p className="mt-1.5 font-serif text-lg font-semibold text-ink">{businessLoading ? '…' : k.value ?? '—'}</p>
                <p className="text-[11px] text-muted">{k.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/analyze')}
            className="mt-4 w-full rounded-xl bg-forest-deep py-2.5 text-sm font-semibold text-white hover:bg-forest"
          >
            Open Full Location Analysis →
          </button>
        </Card>
      </div>

      {/* Factor comparison chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-ink">Suitability Factors</h3>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Users2 className="h-3.5 w-3.5" /> {selected.name}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={factorDefinitions} margin={{ left: -10 }}>
            <XAxis dataKey="factor" tick={{ fontSize: 11, fill: '#7a7266' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#7a7266' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e4dccf', fontSize: 12 }} />
            <Bar dataKey="value" name="Score" radius={[4, 4, 0, 0]}>
              {factorDefinitions.map((f) => (
                <Cell key={f.factor} fill={barColor(f.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] text-muted">
          {isDemo ? 'Demo scenario scores are generated from the selected coordinates and business type. They are not verified nearby place counts.' : 'These comparative proxy scores use mapped OpenStreetMap features within the selected radius. Population, rent, footfall and financial forecasts are not available from this data source.'}
        </p>
      </Card>
    </div>
  );
}
