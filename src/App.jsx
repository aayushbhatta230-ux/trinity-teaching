import { useEffect, useMemo } from 'react';
import { AppShell } from './components/Chrome.jsx';
import { useRoute, navigate } from './lib/router.js';
import { sanitize, firstOpenStep, stepIndex, selectionBefore, prevStep, PARAM, STEPS } from './lib/flow.js';
import { INSTITUTION } from './data/institution.js';
import Home from './screens/Home.jsx';
import ChoiceScreen from './screens/ChoiceScreen.jsx';
import TeacherScreen from './screens/TeacherScreen.jsx';
import ResourcesScreen from './screens/ResourcesScreen.jsx';
import Viewer from './viewer/Viewer.jsx';
import { useHardwareBack, hasOpenOverlay, exitApp } from './lib/native.js';

const FLOW = new Set(STEPS.map((s) => s.id));

const toParams = (sel) => Object.fromEntries(Object.entries(PARAM).map(([k, p]) => [p, sel[k]]));
const fromParams = (params) => Object.fromEntries(Object.entries(PARAM).map(([k, p]) => [k, params[p]]));

export default function App() {
  const { path, params } = useRoute();
  const sel = useMemo(() => sanitize(fromParams(params)), [params]);

  // Guard: never show a step whose earlier choices are missing.
  const need = path === 'view' ? 'resources' : path;
  const open = firstOpenStep(sel);
  const missing = STEPS.find((s) => s.id === open).key; // 'teacher' means every choice is made
  const blocked = FLOW.has(need) && !!missing && stepIndex(sel, open) < stepIndex(sel, need);
  useEffect(() => {
    if (blocked) navigate(open, toParams(sel), { replace: true });
    else if (!FLOW.has(path) && path !== 'home' && path !== 'view') navigate('home', {}, { replace: true });
  }, [blocked, open, sel, path]);

  // Idle reset back to home on the selection screens (never inside the viewer).
  useEffect(() => {
    if (path === 'home' || path === 'view') return undefined;
    let t;
    const arm = () => {
      clearTimeout(t);
      // Never reset while a dialog is open (e.g. a teacher is picking a file to upload).
      t = setTimeout(() => (hasOpenOverlay() ? arm() : navigate('home', {}, { replace: true })), INSTITUTION.idleResetMs);
    };
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [path]);

  const go = {
    home: () => navigate('home', {}),
    start: () => navigate('class', {}),
    /** Choose a value on a step, drop anything after it, and advance. */
    choose: (step, value) => {
      const key = STEPS.find((s) => s.id === step).key;
      const next = sanitize({ ...selectionBefore(sel, step), [key]: value });
      navigate(firstOpenStep(next), toParams(next));
    },
    jump: (step) => navigate(step, toParams(sel)),
    back: (step) => {
      const prev = prevStep(sel, step);
      navigate(prev ?? 'home', prev ? toParams(sel) : {});
    },
    resources: () => navigate('resources', toParams(sel)),
    open: (id) => navigate('view', { ...toParams(sel), r: id }),
    setPage: (id, page) => navigate('view', { ...toParams(sel), r: id, pg: page }, { replace: true }),
  };

  // Android Back button: Viewer → Presentations, a step → the previous step, Home → exit.
  useHardwareBack(() => {
    if (path === 'home') exitApp();
    else if (path === 'view') go.resources();
    else if (FLOW.has(path)) go.back(path);
    else go.home();
  });

  let screen;
  if (blocked) screen = null;
  else if (path === 'home') screen = <Home onStart={go.start} />;
  else if (path === 'teacher') screen = <TeacherScreen sel={sel} go={go} />;
  else if (path === 'resources') screen = <ResourcesScreen sel={sel} go={go} />;
  else if (path === 'view') screen = <Viewer sel={sel} id={params.r} page={Number(params.pg) || 1} go={go} />;
  else if (FLOW.has(path)) screen = <ChoiceScreen key={path} step={path} sel={sel} go={go} />;

  return <AppShell>{screen}</AppShell>;
}
