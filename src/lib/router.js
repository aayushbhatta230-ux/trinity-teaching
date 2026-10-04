/**
 * Tiny hash router. Routes look like  #/section?c=11&s=M&g=PHY
 * Hash routing works from file:// and on any static host, which suits a kiosk board.
 */
import { useEffect, useState, useCallback } from 'react';

const parse = () => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { path: path || 'home', params: Object.fromEntries(new URLSearchParams(query)) };
};

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function buildHash(path, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  return `#/${path}${q ? `?${q}` : ''}`;
}

export function navigate(path, params, { replace = false } = {}) {
  const hash = buildHash(path, params);
  if (replace) window.history.replaceState(null, '', hash);
  else window.history.pushState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export const useNavigate = () => useCallback(navigate, []);
