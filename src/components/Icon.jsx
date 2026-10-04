import {
  Sunrise, Sun, Atom, Leaf, Sigma, FlaskConical, BookOpen, Languages, Monitor, Triangle, Cog, Zap,
  Thermometer, Hexagon, Sprout, Bug, Presentation, FileText, NotebookPen, PlayCircle, ClipboardList,
  FolderOpen, ChevronLeft, ChevronRight, Home, ArrowRight, Maximize, Minimize, ZoomIn, ZoomOut,
  LayoutGrid, X, Play, Pause, RotateCcw, RotateCw, User, ShieldCheck, Layers, AlertTriangle, Expand,
} from 'lucide-react';

const MAP = {
  sunrise: Sunrise, sun: Sun, atom: Atom, leaf: Leaf, sigma: Sigma, flask: FlaskConical, book: BookOpen,
  languages: Languages, monitor: Monitor, triangle: Triangle, cog: Cog, zap: Zap, thermometer: Thermometer,
  hexagon: Hexagon, sprout: Sprout, bug: Bug, presentation: Presentation, pdf: FileText, notes: NotebookPen,
  video: PlayCircle, assignment: ClipboardList, other: FolderOpen, back: ChevronLeft, next: ChevronRight,
  home: Home, arrow: ArrowRight, maximize: Maximize, minimize: Minimize, zoomIn: ZoomIn, zoomOut: ZoomOut,
  grid: LayoutGrid, close: X, play: Play, pause: Pause, rewind: RotateCcw, forward: RotateCw, user: User,
  shield: ShieldCheck, layers: Layers, alert: AlertTriangle, fit: Expand,
};

/** Sizes are given in design px (at 16px root) and rendered in rem, so icons scale with the screen. */
export default function Icon({ name, size = 48, stroke = 1.75, ...rest }) {
  const C = MAP[name] ?? FolderOpen;
  return <C size={`${size / 16}rem`} strokeWidth={stroke} aria-hidden="true" {...rest} />;
}
