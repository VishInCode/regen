import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Camera } from 'lucide-react';
import { hasGoogleKey, loadMaps } from '../lib/api/googleMaps';

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

// Google Street View panorama rendered alongside the Leaflet map. Uses the same
// Google Maps JS API loader already present in the project (no extra key needed).
export default function StreetViewPanel({ lat, lng, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'unavailable' | 'nokey'>('loading');

  // Initialise panorama once
  useEffect(() => {
    if (!hasGoogleKey) {
      setStatus('nokey');
      return;
    }
    let cancelled = false;
    setStatus('loading');

    loadMaps().then(() => {
      if (cancelled || !containerRef.current) return;

      const sv = new google.maps.StreetViewService();
      sv.getPanorama({ location: { lat, lng }, radius: 100, source: google.maps.StreetViewSource.OUTDOOR }, (data, st) => {
        if (cancelled) return;
        if (st !== google.maps.StreetViewStatus.OK) {
          setStatus('unavailable');
          return;
        }
        panoramaRef.current = new google.maps.StreetViewPanorama(containerRef.current!, {
          position: { lat, lng },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          addressControl: true,
          linksControl: true,
          panControl: true,
          motionTrackingControl: false,
          enableCloseButton: false,
          fullscreenControl: false,
        });
        setStatus('ok');
      });
    }).catch(() => {
      if (!cancelled) setStatus('unavailable');
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update panorama position when location changes after initial mount
  useEffect(() => {
    if (!panoramaRef.current || status !== 'ok') return;
    const sv = new google.maps.StreetViewService();
    sv.getPanorama({ location: { lat, lng }, radius: 100, source: google.maps.StreetViewSource.OUTDOOR }, (data, st) => {
      if (st === google.maps.StreetViewStatus.OK && panoramaRef.current) {
        panoramaRef.current.setPosition({ lat, lng });
      } else {
        setStatus('unavailable');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className="relative flex h-full flex-col border-l border-line bg-[#111]">
      {/* Header bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-white/90" strokeWidth={1.75} />
          <span className="text-xs font-semibold tracking-wide text-white/90">Street View</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 transition hover:bg-white/20"
          aria-label="Close street view"
        >
          <X className="h-4 w-4 text-white/90" />
        </button>
      </div>

      {/* Panorama container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Status overlays */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <p className="text-xs text-white/50">Loading Street View…</p>
        </div>
      )}
      {(status === 'unavailable' || status === 'nokey') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111] p-6 text-center">
          <AlertCircle className="h-7 w-7 text-white/30" />
          <p className="font-serif text-base font-semibold text-white/80">Street View Unavailable</p>
          <p className="max-w-[200px] text-xs leading-relaxed text-white/40">
            {status === 'nokey'
              ? 'A Google Maps API key is required for Street View.'
              : 'No street-level imagery found near this location. Try a different spot.'}
          </p>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/60 transition hover:border-white/40 hover:text-white/90"
          >
            Close
          </button>
        </div>
      )}

      {/* Coordinates footer */}
      {status === 'ok' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 text-center">
          <span className="text-[10px] text-white/50">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}
