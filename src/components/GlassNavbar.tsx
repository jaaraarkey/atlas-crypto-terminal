/**
 * @file GlassNavbar.tsx
 * @description Top-level navigation bar with glassmorphism styling.
 *
 * Renders the ATLAS logo, primary navigation links (Dashboard, Screener),
 * and a dark/light theme toggle button. The navbar uses the `.glass-panel`
 * utility for the frosted-glass backdrop effect and sticks to the top of
 * the viewport for persistent access.
 *
 * The theme toggle renders a Sun icon in dark mode (to switch to light)
 * and a Moon icon in light mode (to switch to dark).
 */

import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GlassNavbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group cursor-pointer">
        <Activity className="w-8 h-8 text-neon group-hover:animate-pulse transition-all duration-300" />
        <h1 className="text-2xl font-bold tracking-widest text-neon drop-shadow-md">ATLAS</h1>
      </Link>
      
      <div className="flex items-center gap-8">
        <Link to="/" className="font-semibold text-[var(--text-secondary)] hover:text-neon hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all">Dashboard</Link>
        <Link to="/screener" className="font-semibold text-[var(--text-secondary)] hover:text-neon hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all">Screener</Link>
        <button 
          onClick={toggleTheme} 
          className="p-2 ml-4 rounded-full border border-[var(--border-glass)] hover:bg-[var(--border-glass)] hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-neon" /> : <Moon className="w-5 h-5 text-[#333]" />}
        </button>
      </div>
    </nav>
  );
}
