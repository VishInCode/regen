import { useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search, Bell, ChevronDown, MapPin, Loader2 } from 'lucide-react';
import { useLocationStore } from '../lib/location-store';
import { useLocationSearch } from '../lib/hooks/useLocationSearch';
import type { Location } from '../data/types';

export default function Topbar({
  placeholder = 'Search for a location, city, area or coordinates...',
}: {
  placeholder?: string;
}) {
  const { setSelected } = useLocationStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { results, loading, error, degraded } = useLocationSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (l: Location) => {
    setSelected(l, { explicit: true });
    setQuery('');
    setOpen(false);
    navigate('/analyze');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 bg-canvas/85 px-5 py-4 backdrop-blur-md">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-10 text-sm text-ink outline-none transition focus:border-terra/60 focus:ring-4 focus:ring-terra/10"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}

        {open && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            {loading && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Searching…</p>
            )}
            {error && (
              <p className="px-4 py-3 text-sm text-bad">Search is unavailable right now.</p>
            )}
            {!loading && !error && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">No matching locations found.</p>
            )}
            {results.map((l, i) => (
              <button
                key={l.id}
                onMouseDown={() => choose(l)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
                  i === active ? 'bg-canvas-soft' : 'hover:bg-canvas-soft'
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0 text-terra" />
                <span className="min-w-0">
                  <span className="font-medium text-ink">{l.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {l.displayName ?? [l.city, l.state, l.country].filter(Boolean).join(', ')}
                  </span>
                </span>
              </button>
            ))}
            {degraded && results.length > 0 && (
              <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
                Live geocoding unavailable — showing example locations.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setNotifOpen((o) => !o)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-canvas-soft"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-terra" />
      </button>
      {notifOpen && (
        <div className="absolute right-20 top-16 z-40 w-72 rounded-2xl border border-line bg-white p-4 shadow-xl">
          <p className="mb-2 font-serif text-lg font-semibold text-ink">Notifications</p>
          <p className="text-sm text-muted">You're all caught up — no new alerts.</p>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-full pl-1 pr-3 transition hover:bg-white/50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-deep text-sm font-semibold text-white">
            V
          </span>
          <span className="hidden text-sm font-semibold text-ink sm:block">Vishal Yadav</span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            {[
              { label: 'Saved Places', to: '/saved' },
              { label: 'Reports', to: '/reports' },
              { label: 'Settings', to: '/settings' },
            ].map((m) => (
              <button
                key={m.to}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(m.to);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-canvas-soft"
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
