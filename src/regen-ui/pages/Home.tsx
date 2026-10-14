import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Layers,
  Users,
  Building2,
  Leaf,
  Landmark,
  ArrowUp,
  Target,
  GitCompare,
  FileText,
  MapPin,
  Home as HomeIcon,
  BarChart3,
  Square,
} from 'lucide-react';
import { Card, SectionHeading, ViewAll, ArrowButton, Tag } from '../components/ui';
import { useLocationStore } from '../lib/location-store';
import { LOCATIONS } from '../data/mock';

const doItems = [
  {
    title: 'Real Estate',
    body: 'Find or analyze land for development.',
    img: '1560518883-ce09059eeffa',
    to: '/analyze',
  },
  {
    title: 'Business Planning',
    body: 'Find the right market for your next move.',
    img: '1486406146926-c627a92ad1ab',
    to: '/business',
  },
  {
    title: 'Public Planning',
    body: 'Plan better places for communities.',
    img: '1518005020951-eccb494ad742',
    to: '/public',
  },
  {
    title: 'Explore Map',
    body: 'Understand what is happening around you.',
    img: '1470071459604-3b5ec3a7fe05',
    to: '/explore',
  },
];

const filters = [
  { label: 'Land Use', icon: Layers },
  { label: 'Population', icon: Users },
  { label: 'Infrastructure', icon: Building2 },
  { label: 'Environment', icon: Leaf },
  { label: 'Government Projects', icon: Landmark },
];

const insights = [
  { icon: Users, value: '48,200', label: 'Population', delta: '2.4%' },
  { icon: HomeIcon, value: '12,400', label: 'Households', delta: '1.8%' },
  { icon: BarChart3, value: '3.8%', label: 'Growth Rate', delta: '0.6%' },
  { icon: Square, value: '2.1 km²', label: 'Area', delta: null },
];

const nextSteps = [
  { icon: Target, label: 'Refine financial estimates', to: '/business' },
  { icon: GitCompare, label: 'Compare with other locations', to: '/explore' },
  { icon: FileText, label: 'Generate detailed report', to: '/reports' },
  { icon: MapPin, label: 'Conduct site visit', to: '/analyze' },
];

export default function Home() {
  const navigate = useNavigate();
  const { selected } = useLocationStore();
  const [search, setSearch] = useState('');

  const goExplore = () => {
    const q = search.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pt-1">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-forest-deep">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&h=500&fit=crop&auto=format"
          alt="Valley town framed by mountains at sunset"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-deep via-forest-deep/70 to-transparent" />
        <div className="relative flex items-center justify-between gap-6 p-8 md:p-12">
          <div className="max-w-xl text-white">
            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
              Find the right place
              <br />
              for a <span className="text-terra-soft">better tomorrow.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/75 md:text-base">
              AI-powered location intelligence for sustainable development, smarter
              investments and stronger communities.
            </p>
          </div>
          <Card className="hidden shrink-0 !bg-white/95 p-3 backdrop-blur md:flex md:items-center md:gap-3">
            <img
              src={selected.image}
              alt={selected.name}
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                {selected.city}, {selected.state}
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="text-xs font-medium text-terra"
              >
                Change location
              </button>
            </div>
          </Card>
        </div>
      </section>

      {/* Search + filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goExplore()}
              placeholder="Search for a city, area or drop a pin..."
              className="w-full rounded-xl border border-line bg-canvas-soft py-3 pl-11 pr-4 text-sm outline-none focus:border-terra/60"
            />
          </div>
          <button
            onClick={goExplore}
            className="flex items-center justify-center gap-2 rounded-xl bg-terra px-8 py-3 text-sm font-semibold text-white transition hover:bg-terra-soft"
          >
            Explore <span aria-hidden>→</span>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 rounded-full border border-line bg-canvas-soft px-3.5 py-2 text-sm text-ink transition hover:border-terra/40"
            >
              <f.icon className="h-4 w-4 text-terra" strokeWidth={1.75} />
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* What would you like to do */}
      <section>
        <SectionHeading title="What would you like to do?" action={<ViewAll onClick={() => navigate('/explore')} />} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {doItems.map((d) => (
            <Card key={d.title} className="group overflow-hidden">
              <div className="h-36 overflow-hidden bg-canvas-soft">
                <img
                  src={`https://images.unsplash.com/photo-${d.img}?w=400&h=250&fit=crop&auto=format`}
                  alt={d.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-ink">{d.title}</h3>
                  <p className="mt-1 text-sm text-muted">{d.body}</p>
                </div>
                <ArrowButton onClick={() => navigate(d.to)} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent + Key insights */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading title="Recent Projects" action={<ViewAll onClick={() => navigate('/saved')} />} />
          <div className="space-y-2">
            {LOCATIONS.slice(0, 3).map((l, i) => (
              <button
                key={l.id}
                onClick={() => navigate('/analyze')}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-canvas-soft"
              >
                <img src={l.image} alt={l.name} className="h-12 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-muted">
                    {l.city}, {l.state}
                  </p>
                </div>
                <Tag>{['Hospital Project', 'Commercial', 'Residential'][i]}</Tag>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Key Insights" action={<ViewAll onClick={() => navigate('/analyze')} />} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {insights.map((k) => (
              <div key={k.label} className="rounded-xl border border-line bg-canvas-soft p-3">
                <k.icon className="h-5 w-5 text-forest-mid" strokeWidth={1.75} />
                <p className="mt-2 font-serif text-xl font-semibold text-ink">{k.value}</p>
                <p className="text-xs text-muted">{k.label}</p>
                {k.delta ? (
                  <p className="mt-1 flex items-center gap-0.5 text-xs font-medium text-good">
                    <ArrowUp className="h-3 w-3" /> {k.delta}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">—</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Recommended Next Steps</p>
              <span className="text-terra" aria-hidden>
                →
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {nextSteps.map((s) => (
                <button
                  key={s.label}
                  onClick={() => navigate(s.to)}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3 text-left text-xs text-ink transition hover:border-terra/40"
                >
                  <s.icon className="h-4 w-4 text-terra" strokeWidth={1.75} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
