import { useEffect, useRef, useState } from 'react';
import { AARHUS_C, DEMO_FORCE_LOCATION } from './constants';

/**
 * Live GPS via navigator.geolocation.watchPosition.
 *
 * Returns the current position plus an `estimated` flag — when GPS is denied or
 * unavailable we fall back to Aarhus C and the UI must clearly say so.
 *
 * status: 'idle' | 'locating' | 'live' | 'denied' | 'unsupported' | 'error'
 */
export function useGeolocation({ watch = true, enableHighAccuracy = true } = {}) {
  const [position, setPosition] = useState(AARHUS_C);
  const [accuracy, setAccuracy] = useState(null);
  const [status, setStatus] = useState(DEMO_FORCE_LOCATION ? 'demo' : 'idle');
  const watchId = useRef(null);

  useEffect(() => {
    if (DEMO_FORCE_LOCATION) return undefined; // pinned to Aarhus C for the demo
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return undefined;
    }

    setStatus('locating');

    const onSuccess = (pos) => {
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setAccuracy(pos.coords.accuracy ?? null);
      setStatus('live');
    };

    const onError = (err) => {
      // 1 = PERMISSION_DENIED. Keep the Aarhus C fallback in place either way.
      setStatus(err && err.code === 1 ? 'denied' : 'error');
    };

    const options = { enableHighAccuracy, timeout: 12000, maximumAge: 10000 };

    if (watch) {
      watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, options);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [watch, enableHighAccuracy]);

  // In demo mode the pinned Aarhus location is treated as authoritative (no
  // "GPS off" warnings); otherwise anything but a live fix is an estimate.
  const estimated = !DEMO_FORCE_LOCATION && status !== 'live';
  return { position, accuracy, status, estimated };
}
