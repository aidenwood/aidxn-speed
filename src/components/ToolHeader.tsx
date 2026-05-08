import React, { useState, useCallback, useEffect } from 'react';

/**
 * Aidxn globe mark — animated spinning meridians.
 * Extracted from aidxn.com.
 */
const meridians = [
  { start: 0, end: 45 },
  { start: 45, end: 90 },
  { start: 90, end: 135 },
  { start: 135, end: 180 },
];

function AidxnGlobe({ className = 'h-6' }: { className?: string }) {
  return (
    <div className={`${className} aspect-square shrink-0`}>
      <svg viewBox="-550 -550 1100 1100" className="h-full w-full" style={{ perspective: '50px' }}>
        <defs>
          <style>{`@keyframes aidxn-globe-spin { 100% { transform: rotateZ(-20deg) rotateX(35deg) rotateY(var(--end)); } }`}</style>
        </defs>
        <circle r="440" stroke="#7c3aed" strokeWidth="55" fill="none" opacity="0.8" />
        <circle r="440" stroke="#a600ff" strokeWidth="50" fill="none" opacity="0.95" style={{ transform: 'rotateZ(-20deg) rotateX(125deg)' }} />
        {meridians.map((m, i) => (
          <circle key={i} r="440" stroke="#8b5cf6" strokeWidth="45" fill="none" opacity="0.7"
            style={{ '--start': `${m.start}deg`, '--end': `${m.end}deg`, animation: '2s linear infinite aidxn-globe-spin', transform: `rotateZ(-20deg) rotateX(35deg) rotateY(${m.start}deg)` } as React.CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === 'dark' : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }, [isDark]);

  return (
    <button
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}

interface ToolHeaderProps {
  toolName: string;
  toolsHref?: string;
}

export default function ToolHeader({ toolName, toolsHref = 'https://tools.aidxn.com' }: ToolHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/60 backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-[1920px] items-center justify-between px-5 md:px-10 lg:px-16">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <a href="https://aidxn.com" className="flex shrink-0 items-center gap-1.5 transition hover:opacity-80">
            <AidxnGlobe className="h-5 sm:h-6" />
            <span className="text-sm font-medium tracking-tight text-white sm:text-base">Aidxn</span>
          </a>

          <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>

          <a href={toolsHref} className="text-[13px] font-medium text-neutral-500 transition hover:text-neutral-300">
            Tools
          </a>

          <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>

          <span className="text-[13px] font-medium text-white">{toolName}</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <a href={toolsHref} className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-neutral-400 transition hover:bg-white/[0.05] hover:text-neutral-200 sm:inline-flex">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            All Tools
          </a>
          <ThemeToggle />
          <a href="https://aidxn.com" className="ml-1 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500">
            aidxn.com
          </a>
        </div>
      </div>
    </header>
  );
}
