import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Save,
  Search,
  UtensilsCrossed,
  Users,
  GraduationCap,
  Briefcase,
  Plane,
  Home as HomeIcon,
  Store,
  Building2,
  ChevronDown,
  Users2,
  Footprints,
  ShoppingBag,
  CheckCircle2,
  MapPinOff,
  Loader2,
} from 'lucide-react';
import RegenMap from '../components/RegenMap';
import { Card } from '../components/ui';
import { useLocationStore } from '../lib/location-store';
import { useLocationSearch } from '../lib/hooks/useLocationSearch';
import { useLocationAnalysis } from '../lib/hooks/useLocationAnalysis';
import { BUSINESS_PROFILES } from '../lib/analysis/businessScore';
import type { Location } from '../data/types';

const steps = ['Business Details', 'Location & Area', 'Preferences', 'Analysis', 'Results'];

const customers = [
  { label: 'General Public', icon: Users },
  { label: 'Students', icon: GraduationCap },
  { label: 'Office Workers', icon: Briefcase },
  { label: 'Tourists', icon: Plane },
  { label: 'Local Residents', icon: HomeIcon },
];

const sizes = [
  { label: 'Small', sub: '< 1,000 sq ft', icon: Store },
  { label: 'Medium', sub: '1,000 – 5,000 sq ft', icon: Building2 },
  { label: 'Large', sub: '> 5,000 sq ft', icon: Building2 },
];

export default function BusinessPlanning() {
  const navigate = useNavigate();
  const { selected, setSelected, locationExplicit, analysisRadius, setObjective, saveLocation } =
    useLocationStore();
  const [selectedCustomers, setSelectedCustomers] = useState(['General Public']);
  const [size, setSize] = useState('Small');
  const [businessType, setBusinessType] = useState('food-beverage');
  const [investment, setInvestment] = useState('₹ 25,00,000');
  const [revenue, setRevenue] = useState('₹ 5,00,000');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const { results, loading: searching } = useLocationSearch(query);
  const { analysis, loading } = useLocationAnalysis(locationExplicit ? selected : null, analysisRadius);

  const toggleCustomer = (l: string) =>
    setSelectedCustomers((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]));

  const choose = (l: Location) => {
    setSelected(l, { explicit: true });
    setQuery('');
    setSearchOpen(false);
  };

  const count = (cat: string) => analysis?.facilities.find((f) => f.category === cat)?.count ?? 0;

  const proceed = () => {
    setObjective('business');
    const businessRequest = {
        businessType,
        targetCustomers: selectedCustomers,
        businessSize: size.toLowerCase(),
        expectedInvestment: Number(investment.replace(/[^0-9]/g, '')),
        expectedMonthlyRevenue: Number(revenue.replace(/[^0-9]/g, '')),
        location: { latitude: selected.latitude, longitude: selected.longitude },
        locationName: selected.name,
        searchRadiusKm: analysisRadius / 1_000,
      };
    sessionStorage.setItem('regen.businessRequest', JSON.stringify(businessRequest));
    navigate('/business/results', {
      state: businessRequest,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between px-5 pb-3 pt-4">
        <div>
          <p className="text-sm text-muted">Business Planning › New Analysis</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">Business Opportunity Analysis</h1>
          <p className="mt-1 text-sm text-muted">
            Find the best locations for your business using data-driven insights.
          </p>
        </div>
        <button
          onClick={() => {
            if (locationExplicit) saveLocation(selected);
            navigate('/');
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas-soft"
        >
          <Save className="h-4 w-4" /> Save & Exit
        </button>
      </div>

      <div className="mx-5 mb-4 flex items-center gap-2 rounded-2xl border border-line bg-white px-5 py-3">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i === 0 ? 'bg-forest-deep text-white' : 'bg-canvas-soft text-muted'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${i === 0 ? 'font-semibold text-ink' : 'text-muted'}`}>{s}</span>
            {i < steps.length - 1 && <span className="flex-1 border-t border-dashed border-line" />}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 pb-5 lg:grid-cols-2">
        {/* Form */}
        <Card className="h-fit p-6">
          <h2 className="font-serif text-2xl font-semibold text-ink">1. Business Details</h2>
          <p className="mb-5 mt-1 text-sm text-muted">
            Tell us about the business you want to plan. This configures the analysis and scoring model.
          </p>

          <Field label="Business Type">
            <div className="relative">
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5 pr-10 text-sm text-ink outline-none focus:border-terra/60"
              >
                {Object.values(BUSINESS_PROFILES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </Field>

          <p className="mb-2 mt-4 text-sm font-medium text-ink">Target Customers</p>
          <div className="flex flex-wrap gap-2">
            {customers.map((c) => {
              const on = selectedCustomers.includes(c.label);
              return (
                <button
                  key={c.label}
                  onClick={() => toggleCustomer(c.label)}
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition ${
                    on ? 'border-forest-mid bg-forest-mid/10 text-ink' : 'border-line text-muted'
                  }`}
                >
                  <c.icon className="h-4 w-4" strokeWidth={1.75} /> {c.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Expected Investment">
              <Select
                value={investment}
                onChange={setInvestment}
                options={['₹ 10,00,000', '₹ 25,00,000', '₹ 50,00,000', '₹ 1,00,00,000']}
              />
            </Field>
            <Field label="Expected Monthly Revenue (assumption)">
              <Select
                value={revenue}
                onChange={setRevenue}
                options={['₹ 2,00,000', '₹ 5,00,000', '₹ 10,00,000', '₹ 20,00,000']}
              />
            </Field>
          </div>
          <p className="-mt-1 mb-3 text-[11px] text-muted">
            Revenue is a user assumption, not a REGEN projection.
          </p>

          <p className="mb-2 text-sm font-medium text-ink">Business Size</p>
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((s) => (
              <button
                key={s.label}
                onClick={() => setSize(s.label)}
                className={`rounded-xl border p-3 text-left transition ${
                  size === s.label ? 'border-forest-mid bg-forest-mid/10' : 'border-line'
                }`}
              >
                <s.icon className="h-5 w-5 text-terra" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-semibold text-ink">{s.label}</p>
                <p className="text-xs text-muted">{s.sub}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button disabled className="rounded-xl border border-line px-5 py-2.5 text-sm text-muted/50">
              ← Back
            </button>
            <button
              onClick={proceed}
              disabled={!locationExplicit}
              className="rounded-xl bg-forest-deep px-6 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-forest disabled:cursor-not-allowed disabled:opacity-40"
              title={locationExplicit ? '' : 'Select a location first'}
            >
              Run Analysis →
            </button>
          </div>
          {!locationExplicit && (
            <p className="mt-2 text-right text-[11px] text-muted">Select a location to enable analysis.</p>
          )}
        </Card>

        {/* Map + preview */}
        <div className="space-y-4">
          <RegenMap
            center={[selected.latitude, selected.longitude]}
            zoom={13}
            className="h-72 overflow-hidden rounded-2xl border border-line"
            pois={locationExplicit ? analysis?.pois.slice(0, 40) ?? [] : []}
            markers={locationExplicit ? [{ id: selected.id, lat: selected.latitude, lng: selected.longitude, color: '#4f9d69' }] : []}
            onMapClick={(lat, lng) =>
              choose({
                id: `coord-${lat}-${lng}`,
                name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                city: '',
                state: '',
                country: '',
                latitude: lat,
                longitude: lng,
                source: { type: 'computed', name: 'Coordinate input' },
              })
            }
          >
            <div className="absolute left-3 right-3 top-3 z-[400]">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white/95 px-3 py-2 shadow backdrop-blur">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  placeholder="Search or click the map to set a location..."
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                {searching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
              </div>
              {searchOpen && query.trim().length >= 2 && results.length > 0 && (
                <div className="mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
                  {results.map((l) => (
                    <button
                      key={l.id}
                      onMouseDown={() => choose(l)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-canvas-soft"
                    >
                      <span className="font-medium text-ink">{l.name}</span>
                      <span className="block truncate text-xs text-muted">{l.displayName ?? l.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </RegenMap>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-ink">Quick Insights (Preview)</h3>
              <span className="text-xs text-muted">
                {locationExplicit ? `Within ${(analysisRadius / 1000).toFixed(0)} km` : 'No location selected'}
              </span>
            </div>

            {!locationExplicit ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-10 text-center">
                <MapPinOff className="h-7 w-7 text-muted" />
                <p className="mt-2 text-sm font-medium text-ink">Select a location to preview insights</p>
                <p className="mt-1 max-w-xs text-xs text-muted">
                  Search above, click the map, or arrive here from Explore Map with a selected location.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: Users2, value: analysis ? analysis.pois.length : '…', label: 'POIs detected' },
                  { icon: Footprints, value: count('transport'), label: 'Transport nodes' },
                  { icon: ShoppingBag, value: count('food'), label: 'Similar (food) venues' },
                  { icon: Building2, value: `${count('healthcare')} / ${count('education')}`, label: 'Health / Education' },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-line bg-canvas-soft p-3">
                    <k.icon className="h-4 w-4 text-terra" strokeWidth={1.75} />
                    <p className="mt-1.5 font-serif text-lg font-semibold text-ink">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : k.value}
                    </p>
                    <p className="text-xs text-muted">{k.label}</p>
                  </div>
                ))}
              </div>
            )}

            {locationExplicit && analysis && (
              <div className="mt-4 rounded-xl border border-line p-3">
                <p className="mb-1.5 text-sm font-semibold text-ink">Why this area?</p>
                <ul className="space-y-1">
                  {analysis.factors.slice(0, 4).map((f) => (
                    <li key={f.factor} className="flex items-center gap-1.5 text-xs text-muted">
                      <CheckCircle2 className="h-3.5 w-3.5 text-good" /> {f.factor}: {f.value}/100
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                  Source: {analysis.degraded ? 'REGEN fallback data' : 'OpenStreetMap'} · estimated
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-3 ${className}`}>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5 pr-10 text-sm text-ink outline-none focus:border-terra/60"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
