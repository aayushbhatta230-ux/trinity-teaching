/**
 * Native (Android app) integration. The same code also runs in a browser,
 * where these helpers simply do nothing.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';

export const isNativeApp = Capacitor.isNativePlatform();

// Open dialogs/overlays register here so the hardware Back button closes them first.
const handlers = [];

/** While `active`, the Android Back button calls `onBack` instead of navigating. */
export function useBackHandler(active, onBack) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return undefined;
    const h = () => ref.current();
    handlers.push(h);
    return () => {
      const i = handlers.indexOf(h);
      if (i >= 0) handlers.splice(i, 1);
    };
  }, [active]);
}

/** Wire the Android Back button: innermost overlay first, then `onNavigateBack()`. */
export function useHardwareBack(onNavigateBack) {
  const ref = useRef(onNavigateBack);
  ref.current = onNavigateBack;
  useEffect(() => {
    if (!isNativeApp) return undefined;
    const sub = NativeApp.addListener('backButton', () => {
      const top = handlers[handlers.length - 1];
      if (top) top();
      else ref.current();
    });
    return () => { sub.then((s) => s.remove()); };
  }, []);
}

export const exitApp = () => NativeApp.exitApp();

/** Desktop (Windows) app bridge from desktop/preload.cjs, or undefined in other builds. */
export const desktopApp = typeof window !== 'undefined' ? window.trinityDesktop : undefined;

/** True while a dialog/overlay is open (used to pause the idle reset). */
export const hasOpenOverlay = () => handlers.length > 0;
