import { NavLink } from 'react-router';
import {
  Home,
  Map,
  LineChart,
  Search,
  Building2,
  Landmark,
  Bookmark,
  FileText,
  Layers,
  Settings,
  Leaf,
} from 'lucide-react';

const primary = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore Map', icon: Map },
  { to: '/analyze', label: 'Analyze Land', icon: LineChart },
  { to: '/find-land', label: 'Find Land', icon: Search },
  { to: '/business', label: 'Business Planning', icon: Building2 },
  { to: '/public', label: 'Public Planning', icon: Landmark },
];

const secondary = [
  { to: '/saved', label: 'Saved Places', icon: Bookmark },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/layers', label: 'Data Layers', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Item({ to, label, icon: Icon, end }: (typeof primary)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
          isActive
            ? 'bg-canvas-soft text-forest-deep font-semibold shadow-sm'
            : 'text-white/70 hover:text-white hover:bg-white/5',
        ].join(' ')
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col bg-forest text-white lg:flex">
      <div className="flex items-center gap-2.5 px-6 pb-6 pt-7">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-terra/90">
          <Leaf className="h-5 w-5 text-white" strokeWidth={2} />
        </span>
        <span className="font-serif text-2xl font-semibold tracking-tight">Regen</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {primary.map((i) => (
          <Item key={i.to} {...i} />
        ))}
      </nav>

      <div className="mx-6 my-4 h-px bg-white/10" />

      <nav className="flex flex-col gap-1 px-3">
        {secondary.map((i) => (
          <Item key={i.to} {...i} />
        ))}
      </nav>

      <div className="relative mt-auto">
        <div className="relative h-52 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=500&fit=crop&auto=format"
            alt="Himalayan foothills at dusk"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/40 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6">
            <p className="font-serif text-lg leading-snug">
              From data
              <br />
              to a more
              <br />
              liveable tomorrow.
            </p>
            <div className="mt-3 h-px w-10 bg-terra" />
          </div>
        </div>
      </div>
    </aside>
  );
}
