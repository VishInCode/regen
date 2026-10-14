import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCATION, LOCATIONS } from '../data/mock';
import type { LandParcel, Location } from '../data/types';

export type Objective = 'real-estate' | 'business' | 'urban-planning' | 'rural-planning' | null;
export type PlanningMode = 'urban' | 'rural' | null;

interface RegenStore {
  // selection
  selected: Location;
  setSelected: (loc: Location, opts?: { explicit?: boolean }) => void;
  /** True once the user has explicitly picked a location (search/map click). */
  locationExplicit: boolean;

  selectedLandParcel: LandParcel | null;
  setSelectedLandParcel: (p: LandParcel | null) => void;

  // map view
  mapZoom: number;
  setMapZoom: (z: number) => void;

  // analysis config
  analysisRadius: number; // meters
  setAnalysisRadius: (m: number) => void;

  activeLayers: string[];
  toggleLayer: (id: string) => void;
  setActiveLayers: (ids: string[]) => void;

  objective: Objective;
  setObjective: (o: Objective) => void;
  planningMode: PlanningMode;
  setPlanningMode: (m: PlanningMode) => void;

  // persisted collections
  saved: string[]; // saved ids (locations, land, candidates)
  toggleSaved: (id: string) => void;
  savedPlaces: Location[];
  saveLocation: (loc: Location) => void;
  removeSavedPlace: (id: string) => void;

  recentLocations: Location[];

  all: Location[];
}

const Ctx = createContext<RegenStore | null>(null);

const DEFAULT_LAYERS = ['healthcare', 'education', 'transport', 'retail'];

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [initialSelection] = useState(() =>
    loadJSON<{ selected: Location; explicit: boolean }>('regen.locationSelection', { selected: DEFAULT_LOCATION, explicit: false }),
  );
  const [selected, setSelectedState] = useState<Location>(initialSelection.selected);
  const [locationExplicit, setLocationExplicit] = useState(initialSelection.explicit);
  const [selectedLandParcel, setSelectedLandParcel] = useState<LandParcel | null>(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [analysisRadius, setAnalysisRadius] = useState(3000);
  const [activeLayers, setActiveLayers] = useState<string[]>(DEFAULT_LAYERS);
  const [objective, setObjective] = useState<Objective>(null);
  const [planningMode, setPlanningMode] = useState<PlanningMode>(null);

  const [saved, setSaved] = useState<string[]>(() => loadJSON('regen.saved', ['prem-nagar']));
  const [savedPlaces, setSavedPlaces] = useState<Location[]>(() =>
    loadJSON('regen.savedPlaces', [DEFAULT_LOCATION]),
  );
  const [recentLocations, setRecentLocations] = useState<Location[]>(() =>
    loadJSON('regen.recent', []),
  );

  useEffect(() => localStorage.setItem('regen.saved', JSON.stringify(saved)), [saved]);
  useEffect(() => {
    localStorage.setItem('regen.locationSelection', JSON.stringify({ selected, explicit: locationExplicit }));
  }, [selected, locationExplicit]);
  useEffect(
    () => localStorage.setItem('regen.savedPlaces', JSON.stringify(savedPlaces)),
    [savedPlaces],
  );
  useEffect(
    () => localStorage.setItem('regen.recent', JSON.stringify(recentLocations)),
    [recentLocations],
  );

  const setSelected: RegenStore['setSelected'] = (loc, opts) => {
    setSelectedState(loc);
    if (opts?.explicit) {
      setLocationExplicit(true);
      setRecentLocations((r) => [loc, ...r.filter((x) => x.id !== loc.id)].slice(0, 8));
    }
  };

  const value = useMemo<RegenStore>(
    () => ({
      selected,
      setSelected,
      locationExplicit,
      selectedLandParcel,
      setSelectedLandParcel,
      mapZoom,
      setMapZoom,
      analysisRadius,
      setAnalysisRadius,
      activeLayers,
      toggleLayer: (id) =>
        setActiveLayers((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])),
      setActiveLayers,
      objective,
      setObjective,
      planningMode,
      setPlanningMode,
      saved,
      toggleSaved: (id) =>
        setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
      savedPlaces,
      saveLocation: (loc) =>
        setSavedPlaces((p) => (p.some((x) => x.id === loc.id) ? p : [loc, ...p])),
      removeSavedPlace: (id) => setSavedPlaces((p) => p.filter((x) => x.id !== id)),
      recentLocations,
      all: LOCATIONS,
    }),
    [
      selected,
      locationExplicit,
      selectedLandParcel,
      mapZoom,
      analysisRadius,
      activeLayers,
      objective,
      planningMode,
      saved,
      savedPlaces,
      recentLocations,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocationStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocationStore must be used within LocationProvider');
  return ctx;
}

export const useRegen = useLocationStore;
