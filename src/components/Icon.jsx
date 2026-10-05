import {
  Sunrise, Sun, Atom, Leaf, Sigma, FlaskConical, BookOpen, Languages, Monitor, Triangle, Cog, Zap,
  Thermometer, Hexagon, Sprout, Bug, Presentation, FileText, FolderOpen, ChevronLeft, ChevronRight, Home, ArrowRight, Maximize, Minimize, ZoomIn, ZoomOut,
  LayoutGrid, X, User, ShieldCheck, AlertTriangle, Upload, Trash2, Check, Settings2, Minus, Plus, Power, Variable,
} from 'lucide-react';

const MAP = {
  sunrise: Sunrise, sun: Sun, atom: Atom, leaf: Leaf, sigma: Sigma, flask: FlaskConical, book: BookOpen,
  languages: Languages, monitor: Monitor, triangle: Triangle, cog: Cog, zap: Zap, thermometer: Thermometer,
  hexagon: Hexagon, sprout: Sprout, bug: Bug, presentation: Presentation, pdf: FileText,
  back: ChevronLeft, next: ChevronRight,
  home: Home, arrow: ArrowRight, maximize: Maximize, minimize: Minimize, zoomIn: ZoomIn, zoomOut: ZoomOut,
  grid: LayoutGrid, close: X, user: User, shield: ShieldCheck, alert: AlertTriangle,
  upload: Upload, trash: Trash2, check: Check, settings: Settings2, minus: Minus, plus: Plus, power: Power, variable: Variable,
};

/** Sizes are given in design px (at 16px root) and rendered in rem, so icons scale with the screen. */
export default function Icon({ name, size = 48, stroke = 1.75, ...rest }) {
  const C = MAP[name] ?? FolderOpen;
  return <C size={`${size / 16}rem`} strokeWidth={stroke} aria-hidden="true" {...rest} />;
}
