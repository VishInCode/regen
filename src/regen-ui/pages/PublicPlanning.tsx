import { useNavigate } from 'react-router';
import {
  Building2,
  Sprout,
  TrendingUp,
  Layers,
  Shield,
  Users2,
  Leaf,
  Droplets,
  Route,
  Wheat,
} from 'lucide-react';
import { Card, ViewAll } from '../components/ui';
import { LOCATIONS } from '../data/mock';

const urban = {
  route: 'urban',
  tag: 'Urban Planning',
  title: 'Urban\nDevelopment',
  body: 'Plan for smarter, more liveable and sustainable cities using data on population, infrastructure, land use, environment and growth opportunities.',
  img: '1449824913935-59a10b8d2000',
  cta: 'Explore Urban Planning',
  features: [
    { icon: TrendingUp, label: 'Urban Growth & Expansion' },
    { icon: Building2, label: 'Infrastructure Planning' },
    { icon: Layers, label: 'Land Use Optimization' },
    { icon: Shield, label: 'Risk & Resilience' },
  ],
};

const rural = {
  route: 'rural',
  tag: 'Rural Planning',
  title: 'Rural\nDevelopment',
  body: 'Support balanced and inclusive growth in rural areas with insights on agriculture, resources, infrastructure, livelihoods and basic services.',
  img: '1500382017468-9049fed747ef',
  cta: 'Explore Rural Planning',
  features: [
    { icon: Wheat, label: 'Agriculture & Land Use' },
    { icon: Route, label: 'Rural Infrastructure & Connectivity' },
    { icon: Users2, label: 'Livelihood Opportunities' },
    { icon: Droplets, label: 'Resource Management' },
  ],
};

const helps = [
  { icon: Users2, title: 'Data-driven Decisions', body: 'Use reliable spatial and socio-economic data for better planning and policy decisions.' },
  { icon: Layers, title: 'Integrated Insights', body: 'Understand land, people, infrastructure, environment and development together.' },
  { icon: Leaf, title: 'Sustainable Growth', body: 'Identify opportunities for inclusive and resilient development.' },
  { icon: Shield, title: 'Stronger Communities', body: 'Plan for better services, livelihoods and quality of life.' },
];

export default function PublicPlanning() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl space-y-6 pt-1">
      <div>
        <p className="text-sm text-muted">Public Planning</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-ink md:text-5xl">
          Public Planning
        </h1>
        <p className="mt-1 text-muted">
          Choose a planning context to get relevant insights, data and recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[urban, rural].map((c) => (
          <div
            key={c.tag}
            className="relative overflow-hidden rounded-3xl border border-line bg-forest-deep text-white"
          >
            <img
              src={`https://images.unsplash.com/photo-${c.img}?w=800&h=500&fit=crop&auto=format`}
              alt={c.tag}
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/60 to-forest-deep/10" />
            <div className="relative flex h-full flex-col p-7">
              <span className="w-fit rounded-lg bg-black/30 px-3 py-1.5 text-xs font-medium backdrop-blur">
                {c.tag}
              </span>
              <div className="mt-24">
                <h2 className="whitespace-pre-line font-serif text-4xl font-semibold leading-tight">
                  {c.title}
                </h2>
                <p className="mt-3 max-w-md text-sm text-white/80">{c.body}</p>
                <button
                  onClick={() => navigate(`/public/${c.route}`)}
                  className="mt-5 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-forest-deep transition hover:bg-canvas-soft"
                >
                  {c.cta} →
                </button>
              </div>
              <div className="mt-6 grid grid-cols-4 gap-2 border-t border-white/15 pt-4">
                {c.features.map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                      <f.icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-[11px] leading-tight text-white/80">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-serif text-2xl font-semibold text-ink">
            How Public Planning helps?
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {helps.map((h) => (
              <div key={h.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-forest-mid">
                  <h.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{h.title}</p>
                  <p className="text-xs text-muted">{h.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-ink">Recent Areas</h2>
            <ViewAll label="View All" onClick={() => navigate('/explore')} />
          </div>
          <div className="space-y-2">
            {LOCATIONS.slice(0, 4).map((l) => (
              <button
                key={l.id}
                onClick={() => navigate('/analyze')}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-canvas-soft"
              >
                <img src={l.image} alt={l.name} className="h-11 w-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-muted">{l.city}, {l.state}</p>
                </div>
                <span className="text-muted" aria-hidden>›</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
