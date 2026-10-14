import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  Star,
  Share2,
  Search,
  Check,
  MapPin,
  Ruler,
  IndianRupee,
  Building2,
  User,
  TrendingUp,
  Triangle,
  Navigation,
  Sprout,
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import RegenMap from '../components/RegenMap';
import { Card, PotentialBadge } from '../components/ui';
import type { LandOpportunity } from '../data/types';
import { fetchLandOpportunity } from '../lib/api/landOpportunities';
import { useLocationStore } from '../lib/location-store';

const tabs = ['Overview', 'Location & Access', 'Surroundings', 'Suitability', 'Environment', 'Documents'];

const whyThis = [
  { icon: Navigation, title: 'Good connectivity', body: 'Close to main road and essential services' },
  { icon: TrendingUp, title: 'Growing residential demand', body: 'Rapid development in surrounding areas' },
  { icon: Triangle, title: 'Favorable terrain', body: 'Mostly flat land, suitable for multiple uses' },
];

export default function LandDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selected, saved, toggleSaved } = useLocationStore();
  const requestedLat = searchParams.get('lat');
  const requestedLng = searchParams.get('lng');
  const requestedRadius = searchParams.get('radiusKm');
  const latitude = requestedLat !== null && Number.isFinite(Number(requestedLat)) ? Number(requestedLat) : selected.latitude;
  const longitude = requestedLng !== null && Number.isFinite(Number(requestedLng)) ? Number(requestedLng) : selected.longitude;
  const radiusKm = requestedRadius !== null && Number.isFinite(Number(requestedRadius)) ? Number(requestedRadius) : 10;
  const [land, setLand] = useState<LandOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('Overview');
  const [mapView, setMapView] = useState('Satellite View');
  const [copied, setCopied] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    fetchLandOpportunity(id, latitude, longitude, radiusKm, controller.signal)
      .then(setLand)
      .catch((error) => { if ((error as Error).name !== 'AbortError') setLoadError('This opportunity is unavailable. Return to Find Land and choose a current result.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, latitude, longitude, radiusKm]);

  if (loading) return <p className="mx-auto max-w-xl py-24 text-center text-sm text-muted">Loading opportunity details…</p>;
  if (!land) return <div className="mx-auto max-w-xl py-24 text-center"><p role="alert" className="text-sm text-bad">{loadError || 'Opportunity unavailable.'}</p><button onClick={() => navigate('/find-land')} className="mt-4 rounded-xl bg-forest-deep px-5 py-2.5 text-sm font-semibold text-white">Back to Find Land</button></div>;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const keyInfo = [
    { icon: Ruler, label: 'Area Size', value: land.acres ? `~${land.acres} Acres` : 'Unavailable' },
    { icon: IndianRupee, label: 'Price', value: land.price },
    { icon: Building2, label: 'Land Use', value: land.landUse },
    { icon: User, label: 'Ownership', value: 'Unavailable' },
    { icon: TrendingUp, label: 'Development Potential', value: land.potential },
    { icon: Triangle, label: 'Terrain', value: 'Unavailable' },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] gap-4 pt-4">
      {/* Left result rail */}
      <div className="hidden w-72 shrink-0 flex-col lg:flex">
        <button
          onClick={() => navigate('/find-land')}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-ink hover:text-terra"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </button>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Opportunity Details</p>
          <button
            onClick={() => navigate('/find-land')}
            className="flex items-center gap-1 text-xs text-muted transition hover:text-ink"
          >
            Sort <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-white p-3 text-sm text-muted">Opportunity zones are generated from map data. Nearby property listings are not connected.</div>
        </div>
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1 space-y-4 pb-6">
        {/* Header */}
        <div className="text-sm text-muted">
          Find Land › Search Results › <span className="text-ink">Land Details</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-4xl font-semibold text-ink">Land Opportunity</h1>
              <PotentialBadge level={land.potential} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-muted">
              <MapPin className="h-4 w-4" /> {land.location}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSaved(land.id)}
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas-soft"
            >
              <Star className={`h-4 w-4 ${saved.includes(land.id) ? 'fill-terra text-terra' : ''}`} />
              {saved.includes(land.id) ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={share}
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas-soft"
            >
              {copied ? <Check className="h-4 w-4 text-good" /> : <Share2 className="h-4 w-4" />}
              {copied ? 'Link copied' : 'Share'}
            </button>
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-forest-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest"
            >
              <Search className="h-4 w-4" /> Contact Owner
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-4 py-2.5 text-sm transition ${
                tab === t
                  ? 'border-b-2 border-forest-deep font-semibold text-ink'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Map + key info */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RegenMap
              center={[land.lat, land.lng]}
              zoom={15}
              className="h-72 overflow-hidden rounded-2xl border border-line"
              markers={[{ id: land.id, lat: land.lat, lng: land.lng, color: '#4f9d69' }]}
            />
            <div className="mt-2 flex gap-2">
              {['Satellite View', 'Street View', 'Nearby Area', 'Topography'].map((v) => (
                <button
                  key={v}
                  onClick={() => setMapView(v)}
                  className={`flex-1 rounded-lg border p-2 text-center text-xs transition ${
                    mapView === v ? 'border-terra text-ink' : 'border-line text-muted hover:border-terra/40'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-5">
            <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Key Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {keyInfo.map((k) => (
                <div key={k.label}>
                  <k.icon className="h-4 w-4 text-terra" strokeWidth={1.75} />
                  <p className="mt-1 text-xs text-muted">{k.label}</p>
                  <p className="text-sm font-semibold text-ink">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-forest-deep p-4 text-white">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Why this land?</p>
                <button onClick={() => navigate('/analyze')} className="text-xs text-terra-soft hover:underline">
                  View Analysis →
                </button>
              </div>
              <div className="space-y-2.5">
                {whyThis.map((w) => (
                  <div key={w.title} className="flex gap-2.5">
                    <w.icon className="mt-0.5 h-4 w-4 shrink-0 text-terra-soft" strokeWidth={1.75} />
                    <div>
                      <p className="text-sm font-medium">{w.title}</p>
                      <p className="text-xs text-white/60">{w.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Details grids */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Land Details</h3>
            <dl className="divide-y divide-line text-sm">
              {[
                ['Survey Number', '—'],
                ['Estimated Area', land.acres ? `~${land.acres} Acres (derived from mapped land-use geometry)` : 'Unavailable'],
                ['Land Use (Current)', 'Agricultural'],
                ['Proposed Land Use', land.landUse],
                ['Ownership', 'Private'],
                ['Price', land.price],
                ['Legal Status', 'Clear (as per available data)'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Nearby Infrastructure</h3>
            <ul className="divide-y divide-line text-sm">
              {(
                [
                  ['Main Road', '800 m', Navigation],
                  ['School', '1.2 km', Building2],
                  ['Hospital', '2.1 km', Sprout],
                  ['Market', '1.5 km', Building2],
                  ['ISBT Dehradun', '8.0 km', MapPin],
                  ['Railway Station', '6.5 km', MapPin],
                  ['Airport (Jolly Grant)', '25 km', MapPin],
                ] as const
              ).map(([k, v, I]) => (
                <li key={k} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-muted">
                    <I className="h-4 w-4 text-terra" strokeWidth={1.75} /> {k}
                  </span>
                  <span className="font-medium text-ink">{v}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Development Potential</h3>
            <div className="flex items-center gap-3">
              <div className="relative h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ v: 82 }, { v: 18 }]} dataKey="v" innerRadius={30} outerRadius={44} startAngle={90} endAngle={-270}>
                      <Cell fill="#4f9d69" />
                      <Cell fill="#e4dccf" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-serif text-sm font-semibold text-good">High</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs leading-relaxed text-muted">Potential rating reflects the REGEN analysis. The API does not provide verified parcel, ownership, or zoning records.</p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-muted">Price history is unavailable because no property listing source is connected.</p>
          </Card>
        </div>
      </div>

      {contactOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-forest-deep/40 p-4"
          onClick={() => setContactOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-2xl font-semibold text-ink">Contact Owner</h3>
            <p className="mt-1 text-sm text-muted">
              Send an enquiry about this {land.acres}-acre {land.landUse.toLowerCase()} parcel in {land.location}.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Your name"
                className="w-full rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5 text-sm outline-none focus:border-terra/60"
              />
              <input
                placeholder="Phone or email"
                className="w-full rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5 text-sm outline-none focus:border-terra/60"
              />
              <textarea
                rows={3}
                placeholder="Message"
                className="w-full rounded-xl border border-line bg-canvas-soft px-3.5 py-2.5 text-sm outline-none focus:border-terra/60"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setContactOpen(false)}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => setContactOpen(false)}
                className="rounded-xl bg-forest-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest"
              >
                Send Enquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
