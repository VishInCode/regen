import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import type { POI } from '../lib/api/types';
import { CATEGORY_STYLE } from '../lib/map/poiStyle';

// Leaflet uses OpenStreetMap streets by default; imagery is an optional basemap.

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color?: string;
  popup?: ReactNode;
  onClick?: () => void;
}

export interface MapPath {
  id: string;
  points: { lat: number; lng: number }[];
  color: string;
  closed?: boolean;
  dashed?: boolean;
}

export interface MapVertex {
  id: string;
  lat: number;
  lng: number;
  color: string;
}

interface RegenMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  pois?: POI[];
  radiusCircle?: { center: [number, number]; radius: number };
  paths?: MapPath[];
  vertices?: MapVertex[];
  satellite?: boolean;
  className?: string;
  loading?: boolean;
  error?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPoiClick?: (poi: POI) => void;
  children?: ReactNode;
}

// ─── Tile sources ────────────────────────────────────────────────────────────

const ESRI_IMAGERY = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP',
  maxZoom: 19,
};

const ESRI_LABELS = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: '',
  maxZoom: 19,
};

const OSM_STREETS = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

// ─── Marker / popup HTML helpers ─────────────────────────────────────────────

function poiIconEl(color: string, glyph: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${color};color:#fff;font:600 11px/1 Inter,sans-serif;border:2px solid #FAF8F3;box-shadow:0 1px 6px rgba(0,0,0,.35);cursor:pointer">${glyph}</div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

function bigPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -20],
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function poiPopupHtml(p: POI): string {
  const rating =
    p.rating != null
      ? `<p style="margin:2px 0 0;font-size:12px;color:#B85F35">★ ${p.rating.toFixed(1)}${p.userRatingCount ? ` · ${p.userRatingCount} reviews` : ''}</p>`
      : '';
  const addr = p.address ? `<p style="margin:4px 0 0;font-size:11px;color:#6b6b6b">${escapeHtml(p.address)}</p>` : '';
  const phone = p.phone ? `<p style="margin:2px 0 0;font-size:11px;color:#6b6b6b">${escapeHtml(p.phone)}</p>` : '';
  const externalUrl = [p.website, p.sourceUrl].find((value) => {
    try { return value ? ['http:', 'https:'].includes(new URL(value).protocol) : false; }
    catch { return false; }
  });
  const link = externalUrl
    ? `<a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#B85F35">${p.website ? 'Website ↗' : 'View ↗'}</a>`
    : '';
  return `<div style="min-width:190px;max-width:240px;padding:12px 14px;font-family:Inter,sans-serif">
    <p style="margin:0;font-weight:600;font-size:14px;color:#1f2421">${escapeHtml(p.name)}</p>
    <p style="margin:2px 0 0;font-size:12px;color:#6b6b6b;text-transform:capitalize">${escapeHtml(p.subtype ?? p.category)}</p>
    ${rating}${addr}${phone}
    <p style="margin:6px 0 0;font-size:10px;color:#9a9a9a">Source: ${escapeHtml(p.source.name)}</p>
    ${link}
  </div>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegenMap({
  center,
  zoom = 13,
  markers = [],
  pois = [],
  radiusCircle,
  paths = [],
  vertices = [],
  satellite = true,
  className = '',
  loading = false,
  error,
  onMapClick,
  onZoomChange,
  onPoiClick,
  children,
}: RegenMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [ready, setReady] = useState(false);

  const cb = useRef({ onMapClick, onZoomChange, onPoiClick });
  useEffect(() => {
    cb.current = { onMapClick, onZoomChange, onPoiClick };
  }, [onMapClick, onZoomChange, onPoiClick]);

  // Layer groups for overlays
  const poiLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const shapeLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Tile layer refs for fallback switching
  const imageryRef = useRef<L.TileLayer | null>(null);
  const labelsRef = useRef<L.TileLayer | null>(null);
  const osmRef = useRef<L.TileLayer | null>(null);
  const fallbackActiveRef = useRef(false);

  const poiKey = useMemo(() => pois.map((p) => p.id).join(','), [pois]);
  const markerKey = useMemo(() => markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.color}`).join(','), [markers]);
  const pathKey = useMemo(() => paths.map((p) => `${p.id}:${p.points.length}:${p.closed}`).join('|'), [paths]);
  const vertexKey = useMemo(() => vertices.map((v) => `${v.id}:${v.lat}:${v.lng}`).join(','), [vertices]);

  // ── Initialize map once ──────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center[0], center[1]],
      zoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Esri World Imagery (default satellite basemap)
    const imagery = L.tileLayer(ESRI_IMAGERY.url, {
      attribution: ESRI_IMAGERY.attribution,
      maxZoom: ESRI_IMAGERY.maxZoom,
    });

    // Esri reference labels overlay (shown on top of imagery)
    const labels = L.tileLayer(ESRI_LABELS.url, {
      attribution: '',
      maxZoom: ESRI_LABELS.maxZoom,
      pane: 'overlayPane',
    });

    // OSM streets are the default Explore basemap.
    const osm = L.tileLayer(OSM_STREETS.url, {
      attribution: OSM_STREETS.attribution,
      maxZoom: OSM_STREETS.maxZoom,
    });

    imageryRef.current = imagery;
    labelsRef.current = labels;
    osmRef.current = osm;

    if (satellite) {
      imagery.addTo(map);
      labels.addTo(map);
    } else {
      osm.addTo(map);
    }

    // If imagery tiles fail, switch to OSM streets.
    imagery.on('tileerror', () => {
      if (fallbackActiveRef.current) return;
      fallbackActiveRef.current = true;
      map.removeLayer(imagery);
      if (map.hasLayer(labels)) map.removeLayer(labels);
      osm.addTo(map);
    });

    // Basemap switcher (layer control) — position topright, below our panels
    L.control
      .layers(
        { 'Satellite (Esri)': imagery, 'Streets (OSM)': osm },
        {},
        { position: 'bottomright', collapsed: true },
      )
      .addTo(map);

    // POI and shape overlay groups
    poiLayerRef.current.addTo(map);
    shapeLayerRef.current.addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      cb.current.onMapClick?.(e.latlng.lat, e.latlng.lng);
    });
    map.on('zoomend', () => {
      cb.current.onZoomChange?.(map.getZoom());
    });

    mapRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respond to container resizes (e.g. street view panel opening/closing)
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready]);

  // ── Re-center when location changes ────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setView([center[0], center[1]], zoom, { animate: true, duration: 0.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center[0], center[1], zoom]);

  // ── Basemap switch via satellite prop ──────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const imagery = imageryRef.current!;
    const labels = labelsRef.current!;
    const osm = osmRef.current!;
    if (satellite && !fallbackActiveRef.current) {
      if (!map.hasLayer(imagery)) imagery.addTo(map);
      if (!map.hasLayer(labels)) labels.addTo(map);
      if (map.hasLayer(osm)) map.removeLayer(osm);
    } else {
      if (map.hasLayer(imagery)) map.removeLayer(imagery);
      if (map.hasLayer(labels)) map.removeLayer(labels);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [ready, satellite]);

  // ── Rebuild POI + location markers ────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const layer = poiLayerRef.current;
    layer.clearLayers();

    pois.forEach((p) => {
      const s = CATEGORY_STYLE[p.category];
      const m = L.marker([p.latitude, p.longitude], { icon: poiIconEl(s.color, s.glyph) });
      m.bindPopup(poiPopupHtml(p), { maxWidth: 260 });
      m.on('click', () => {
        m.openPopup();
        cb.current.onPoiClick?.(p);
      });
      layer.addLayer(m);
    });

    markers.forEach((mk) => {
      const m = L.marker([mk.lat, mk.lng], { icon: bigPinIcon(mk.color ?? '#B85F35') });
      if (mk.onClick) m.on('click', mk.onClick);
      layer.addLayer(m);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, poiKey, markerKey]);

  // ── Rebuild REGEN shape overlays ─────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const layer = shapeLayerRef.current;
    layer.clearLayers();

    if (radiusCircle) {
      L.circle([radiusCircle.center[0], radiusCircle.center[1]], {
        radius: radiusCircle.radius,
        color: '#F4F0E7',
        weight: 1.5,
        fillColor: '#12382F',
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(layer);
    }

    paths.forEach((p) => {
      const latlngs = p.points.map((pt) => [pt.lat, pt.lng] as [number, number]);
      if (p.closed && latlngs.length >= 3) {
        L.polygon(latlngs, {
          color: p.color,
          weight: 2,
          fillColor: p.color,
          fillOpacity: 0.15,
          interactive: false,
          dashArray: p.dashed ? '8 6' : undefined,
        }).addTo(layer);
      } else if (latlngs.length >= 2) {
        L.polyline(latlngs, {
          color: p.color,
          weight: 3,
          interactive: false,
          dashArray: p.dashed ? '8 6' : undefined,
        }).addTo(layer);
      }
    });

    vertices.forEach((v) => {
      L.circleMarker([v.lat, v.lng], {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: v.color,
        fillOpacity: 1,
        interactive: false,
      }).addTo(layer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, radiusCircle?.center[0], radiusCircle?.center[1], radiusCircle?.radius, pathKey, vertexKey]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Leaflet map fills the container */}
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="pointer-events-none absolute right-4 top-4 z-[1500] rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-ink shadow backdrop-blur">
          Loading map data…
        </div>
      )}
      {error && (
        <div className="absolute left-1/2 top-4 z-[1500] -translate-x-1/2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-[#B85F35] shadow backdrop-blur">
          {error}
        </div>
      )}

      {/* HTML overlays rendered as direct children — each manages its own hit area */}
      {children}
    </div>
  );
}
