import React, { useState, useMemo, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  weight: number; // 1-5, how much this impacts score
  description: string;
  fix: string;
  codeExample?: string;
}

interface ResourceInputs {
  html: number;
  css: number;
  js: number;
  images: number;
  fonts: number;
  other: number;
}

type IndustryCategory = 'ecommerce' | 'blog' | 'saas' | 'portfolio' | 'news' | 'landing';

// ─── Data ───────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Images
  {
    id: 'webp',
    category: 'Images',
    title: 'Use modern image formats (WebP/AVIF)',
    weight: 4,
    description: 'Modern formats like WebP and AVIF provide 25-50% better compression than JPEG/PNG with comparable quality.',
    fix: 'Convert images to WebP or AVIF. Use <picture> with fallbacks for older browsers.',
    codeExample: `<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero" />
</picture>`,
  },
  {
    id: 'lazy-loading',
    category: 'Images',
    title: 'Lazy load below-the-fold images',
    weight: 4,
    description: 'Images below the viewport should only load when the user scrolls near them, reducing initial page weight.',
    fix: 'Add loading="lazy" to images below the fold. Never lazy-load your LCP image.',
    codeExample: `<!-- Below the fold -->
<img src="gallery.webp" loading="lazy" alt="..." />

<!-- LCP image: do NOT lazy load -->
<img src="hero.webp" fetchpriority="high" alt="..." />`,
  },
  {
    id: 'srcset',
    category: 'Images',
    title: 'Use responsive images (srcset/sizes)',
    weight: 3,
    description: 'Serving a 2000px image to a 400px mobile screen wastes bandwidth. srcset lets the browser pick the right size.',
    fix: 'Provide multiple image sizes and let the browser choose based on viewport width.',
    codeExample: `<img
  srcset="hero-400.webp 400w,
          hero-800.webp 800w,
          hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 1024px) 800px,
         1200px"
  src="hero-800.webp"
  alt="Hero image"
/>`,
  },
  {
    id: 'image-dimensions',
    category: 'Images',
    title: 'Explicit width/height on images',
    weight: 3,
    description: 'Without explicit dimensions, the browser cannot reserve space, causing layout shifts (CLS) as images load.',
    fix: 'Always set width and height attributes on <img> tags to prevent layout shift.',
    codeExample: `<img
  src="photo.webp"
  width="800"
  height="600"
  alt="Photo"
  style="width: 100%; height: auto;"
/>`,
  },
  // CSS/JS
  {
    id: 'minify-css',
    category: 'CSS & JavaScript',
    title: 'Minify CSS files',
    weight: 3,
    description: 'Minification removes whitespace, comments, and shortens names, typically reducing CSS size by 20-40%.',
    fix: 'Use a build tool like Vite, esbuild, or cssnano to minify CSS in production builds.',
    codeExample: `// vite.config.js — CSS is minified by default in production
export default defineConfig({
  build: {
    cssMinify: true, // default
  },
});`,
  },
  {
    id: 'minify-js',
    category: 'CSS & JavaScript',
    title: 'Minify JavaScript files',
    weight: 3,
    description: 'Minification and tree-shaking can reduce JS bundle size by 40-60%, directly impacting Time to Interactive.',
    fix: 'Use a bundler (Vite, webpack, esbuild) with minification enabled for production.',
    codeExample: `// vite.config.js
export default defineConfig({
  build: {
    minify: 'esbuild', // or 'terser'
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom'] } }
    }
  }
});`,
  },
  {
    id: 'critical-css',
    category: 'CSS & JavaScript',
    title: 'Inline critical CSS',
    weight: 3,
    description: 'Inlining the CSS needed for above-the-fold content eliminates render-blocking stylesheet requests.',
    fix: 'Extract and inline critical CSS in <head>, defer the rest.',
    codeExample: `<head>
  <!-- Critical CSS inlined -->
  <style>
    .hero { display: flex; min-height: 100vh; }
    .nav { position: sticky; top: 0; }
  </style>
  <!-- Non-critical CSS loaded async -->
  <link rel="preload" href="/styles.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'" />
</head>`,
  },
  {
    id: 'defer-js',
    category: 'CSS & JavaScript',
    title: 'Defer non-critical JavaScript',
    weight: 4,
    description: 'Render-blocking scripts delay First Contentful Paint. Defer or async scripts that are not needed immediately.',
    fix: 'Use defer or async on script tags. Move non-critical JS to the end of <body>.',
    codeExample: `<!-- Parser-blocking (bad) -->
<script src="analytics.js"></script>

<!-- Deferred (good) — runs after HTML parse -->
<script src="analytics.js" defer></script>

<!-- Async (good for independent scripts) -->
<script src="analytics.js" async></script>`,
  },
  {
    id: 'code-splitting',
    category: 'CSS & JavaScript',
    title: 'Code split / lazy load routes',
    weight: 3,
    description: 'Loading all JS upfront for a multi-page app is wasteful. Split by route so users only download what they need.',
    fix: 'Use dynamic imports to code-split by route or heavy component.',
    codeExample: `// React lazy loading
const Dashboard = React.lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard />
    </Suspense>
  );
}`,
  },
  // Network
  {
    id: 'compression',
    category: 'Network',
    title: 'Enable GZIP or Brotli compression',
    weight: 5,
    description: 'Text compression reduces transfer size by 60-80%. Brotli offers ~15-20% better compression than GZIP.',
    fix: 'Enable Brotli (preferred) or GZIP in your server/CDN configuration.',
    codeExample: `# Nginx — enable Brotli
brotli on;
brotli_types text/html text/css application/javascript
              application/json image/svg+xml;

# Or GZIP fallback
gzip on;
gzip_types text/html text/css application/javascript;`,
  },
  {
    id: 'caching',
    category: 'Network',
    title: 'Set proper cache headers',
    weight: 4,
    description: 'Caching lets browsers reuse resources on repeat visits, dramatically improving load times for returning users.',
    fix: 'Set long cache lifetimes for hashed assets, short for HTML.',
    codeExample: `# Static assets with hash in filename (1 year)
Cache-Control: public, max-age=31536000, immutable

# HTML pages (revalidate every time)
Cache-Control: no-cache

# API responses (5 minutes)
Cache-Control: public, max-age=300, s-maxage=300`,
  },
  {
    id: 'cdn',
    category: 'Network',
    title: 'Serve assets from a CDN',
    weight: 4,
    description: 'A CDN serves your assets from edge locations close to your users, reducing latency by 50-300ms.',
    fix: 'Use a CDN like Cloudflare, Fastly, or your hosting platform\'s built-in CDN (Netlify, Vercel).',
  },
  {
    id: 'reduce-redirects',
    category: 'Network',
    title: 'Minimize redirects',
    weight: 2,
    description: 'Each redirect adds a full round-trip (100-500ms). Chain redirects multiply this penalty.',
    fix: 'Audit your redirect chains. Update links to point to final URLs directly.',
  },
  {
    id: 'preconnect',
    category: 'Network',
    title: 'Preconnect to required origins',
    weight: 2,
    description: 'DNS lookup + TCP + TLS handshake can add 300ms+ per origin. Preconnect warms these connections early.',
    fix: 'Add <link rel="preconnect"> for third-party origins you know you\'ll need.',
    codeExample: `<head>
  <!-- Preconnect to Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com"
        crossorigin />

  <!-- Preconnect to analytics -->
  <link rel="preconnect" href="https://www.google-analytics.com" />
</head>`,
  },
  // Fonts
  {
    id: 'font-display',
    category: 'Fonts',
    title: 'Use font-display: swap',
    weight: 3,
    description: 'Without swap, text is invisible (FOIT) until the font loads. swap shows a fallback immediately, then swaps.',
    fix: 'Add font-display: swap to your @font-face declarations or Google Fonts URL.',
    codeExample: `@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
}

/* Or via Google Fonts URL */
<link href="https://fonts.googleapis.com/css2?
  family=Inter&display=swap" rel="stylesheet" />`,
  },
  {
    id: 'font-subsetting',
    category: 'Fonts',
    title: 'Subset fonts to used characters',
    weight: 2,
    description: 'Full font files can be 100KB+. Subsetting to Latin characters can reduce this to 15-20KB.',
    fix: 'Use font subsetting tools or packages like @fontsource that provide pre-subsetted files.',
    codeExample: `/* Using @fontsource — already subsetted */
import '@fontsource/inter/latin-400.css';

/* Or subset with fonttools */
/* pyftsubset Inter.ttf --unicodes="U+0000-007F" */`,
  },
  {
    id: 'self-host-fonts',
    category: 'Fonts',
    title: 'Self-host fonts (avoid Google Fonts CDN)',
    weight: 2,
    description: 'Self-hosting eliminates the DNS + connection overhead to fonts.googleapis.com and fonts.gstatic.com.',
    fix: 'Download fonts and serve them from your own domain, or use @fontsource packages.',
    codeExample: `/* Self-hosted with preload */
<link rel="preload" href="/fonts/inter-latin-400.woff2"
      as="font" type="font/woff2" crossorigin />

<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-latin-400.woff2') format('woff2');
    font-display: swap;
    font-weight: 400;
  }
</style>`,
  },
  // Core Web Vitals
  {
    id: 'lcp',
    category: 'Core Web Vitals',
    title: 'LCP under 2.5 seconds',
    weight: 5,
    description: 'Largest Contentful Paint measures when the main content becomes visible. Google targets < 2.5s for "Good".',
    fix: 'Optimize your LCP element: preload hero images, inline critical CSS, use fetchpriority="high".',
    codeExample: `<!-- Preload LCP image -->
<link rel="preload" href="/hero.webp" as="image"
      fetchpriority="high" />

<!-- LCP image with priority hint -->
<img src="/hero.webp" fetchpriority="high"
     alt="Hero" width="1200" height="600" />`,
  },
  {
    id: 'inp',
    category: 'Core Web Vitals',
    title: 'INP under 200 milliseconds',
    weight: 5,
    description: 'Interaction to Next Paint replaced FID in 2024. Measures responsiveness to all user interactions, not just first.',
    fix: 'Break up long tasks, use requestIdleCallback, avoid blocking the main thread with heavy JS.',
    codeExample: `// Break up expensive work
function processLargeList(items) {
  const chunk = 100;
  let i = 0;

  function doChunk() {
    const end = Math.min(i + chunk, items.length);
    for (; i < end; i++) {
      processItem(items[i]);
    }
    if (i < items.length) {
      // Yield to browser between chunks
      requestIdleCallback(doChunk);
    }
  }
  doChunk();
}`,
  },
  {
    id: 'cls',
    category: 'Core Web Vitals',
    title: 'CLS under 0.1',
    weight: 5,
    description: 'Cumulative Layout Shift measures visual stability. Unexpected layout shifts frustrate users and hurt SEO.',
    fix: 'Set explicit dimensions on images/videos, reserve space for ads, avoid inserting content above existing content.',
    codeExample: `/* Reserve space for dynamic content */
.ad-slot {
  min-height: 250px;
  min-width: 300px;
}

/* Aspect ratio box for responsive embeds */
.video-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
}`,
  },
  // DOM & HTML
  {
    id: 'dom-size',
    category: 'HTML & DOM',
    title: 'Keep DOM size under 1,500 nodes',
    weight: 3,
    description: 'Large DOMs slow rendering, increase memory usage, and make style recalculations expensive. Target < 1,500 elements.',
    fix: 'Virtualize long lists, remove hidden elements, simplify deeply nested layouts.',
    codeExample: `// Virtualize long lists with react-window
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  width="100%"
  itemCount={10000}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>Row {index}</div>
  )}
</FixedSizeList>`,
  },
  {
    id: 'semantic-html',
    category: 'HTML & DOM',
    title: 'Use semantic HTML elements',
    weight: 2,
    description: 'Semantic elements (<header>, <main>, <article>) improve accessibility, SEO, and make your code easier to maintain.',
    fix: 'Replace generic <div> wrappers with semantic elements where appropriate.',
    codeExample: `<!-- Instead of divs everywhere -->
<header>...</header>
<nav>...</nav>
<main>
  <article>
    <h1>Title</h1>
    <section>...</section>
  </article>
  <aside>...</aside>
</main>
<footer>...</footer>`,
  },
  // Third Party
  {
    id: 'third-party-audit',
    category: 'Third Party',
    title: 'Audit third-party scripts',
    weight: 4,
    description: 'Third-party scripts (analytics, ads, chat widgets) often add 200-500KB and block the main thread.',
    fix: 'Remove unused scripts, load non-essential ones with defer/async, use Partytown for heavy scripts.',
    codeExample: `<!-- Load analytics after page is interactive -->
<script>
  window.addEventListener('load', () => {
    const s = document.createElement('script');
    s.src = 'https://analytics.example.com/script.js';
    s.defer = true;
    document.body.appendChild(s);
  });
</script>

<!-- Or use Partytown to run in a web worker -->
<script type="text/partytown" src="https://analytics.example.com/script.js"></script>`,
  },
  {
    id: 'above-fold',
    category: 'Rendering',
    title: 'Optimize above-the-fold content',
    weight: 4,
    description: 'The first viewport should render as fast as possible. Inline its CSS, preload its images, minimize JS needed.',
    fix: 'Ensure above-fold content doesn\'t depend on external CSS/JS fetches. Inline critical styles, preload hero assets.',
  },
  {
    id: 'ssr',
    category: 'Rendering',
    title: 'Use SSR or SSG for initial HTML',
    weight: 3,
    description: 'Client-rendered SPAs show a blank page until JS loads. Server rendering gives users content immediately.',
    fix: 'Use SSR (Next.js, Astro, Nuxt) or SSG to pre-render HTML on the server.',
    codeExample: `// Astro — static by default, zero JS unless needed
---
// This runs at build time (SSG)
const posts = await fetch('https://api.example.com/posts')
  .then(r => r.json());
---

<ul>
  {posts.map(p => <li>{p.title}</li>)}
</ul>`,
  },
];

const CATEGORIES = [...new Set(CHECKLIST_ITEMS.map(item => item.category))];

const INDUSTRY_BENCHMARKS: Record<IndustryCategory, { label: string; score: number; lcp: string; cls: string; pageWeight: string }> = {
  ecommerce: { label: 'E-commerce', score: 38, lcp: '4.1s', cls: '0.25', pageWeight: '4.2 MB' },
  blog: { label: 'Blog / Content', score: 62, lcp: '2.8s', cls: '0.12', pageWeight: '2.1 MB' },
  saas: { label: 'SaaS / Web App', score: 45, lcp: '3.5s', cls: '0.18', pageWeight: '3.4 MB' },
  portfolio: { label: 'Portfolio', score: 55, lcp: '3.0s', cls: '0.15', pageWeight: '2.8 MB' },
  news: { label: 'News / Media', score: 32, lcp: '4.8s', cls: '0.32', pageWeight: '5.1 MB' },
  landing: { label: 'Landing Page', score: 68, lcp: '2.3s', cls: '0.08', pageWeight: '1.5 MB' },
};

const NETWORK_SPEEDS = [
  { label: 'Slow 3G', bandwidth: 0.4, latency: 400, color: 'text-red-400' },
  { label: 'Fast 3G', bandwidth: 1.6, latency: 150, color: 'text-orange-400' },
  { label: '4G / LTE', bandwidth: 9.0, latency: 70, color: 'text-yellow-400' },
  { label: 'Fast 4G', bandwidth: 18.0, latency: 40, color: 'text-green-400' },
  { label: 'WiFi', bandwidth: 30.0, latency: 20, color: 'text-cyan-400' },
  { label: 'Fibre', bandwidth: 100.0, latency: 5, color: 'text-violet-400' },
];

// ─── Score Gauge ────────────────────────────────────────────────────────────

function ScoreGauge({ score, label }: { score: number; label?: string }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashoffset = circumference - progress;

  const getColor = (s: number) => {
    if (s >= 90) return { stroke: '#22c55e', text: 'text-green-400', glow: 'shadow-green-500/20' };
    if (s >= 50) return { stroke: '#f59e0b', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' };
    return { stroke: '#ef4444', text: 'text-red-400', glow: 'shadow-red-500/20' };
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="220" height="220" viewBox="0 0 220 220" className="drop-shadow-lg" style={{ filter: `drop-shadow(0 0 20px ${color.stroke}30)` }}>
          {/* Background circle */}
          <circle
            cx="110" cy="110" r={radius}
            fill="none"
            stroke="#262626"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="110" cy="110" r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 110 110)"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold tabular-nums ${color.text}`} style={{ transition: 'color 0.3s ease' }}>
            {score}
          </span>
          <span className="mt-1 text-sm text-neutral-500">/ 100</span>
        </div>
      </div>
      {label && <span className="text-sm font-medium text-neutral-400">{label}</span>}
    </div>
  );
}

// ─── Checklist Item Component ───────────────────────────────────────────────

function ChecklistRow({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      checked
        ? 'border-green-500/20 bg-green-500/[0.03]'
        : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
    }`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
            checked
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-neutral-600 hover:border-violet-500'
          }`}
          aria-label={`Mark "${item.title}" as ${checked ? 'incomplete' : 'complete'}`}
        >
          {checked && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${checked ? 'text-green-400 line-through decoration-green-500/40' : 'text-white'}`}>
              {item.title}
            </span>
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    i < item.weight ? 'bg-violet-500' : 'bg-neutral-700'
                  }`}
                />
              ))}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{item.description}</p>
        </div>

        {/* Expand toggle */}
        {!checked && (item.fix || item.codeExample) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-white/5 hover:text-white"
            aria-label={expanded ? 'Collapse fix details' : 'Expand fix details'}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded fix */}
      {expanded && !checked && (
        <div className="border-t border-neutral-800/60 px-4 py-3 pl-12">
          <div className="flex items-center gap-1.5 text-xs font-medium text-violet-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.38-1.2a.5.5 0 01-.31-.7l4.44-8.65a.5.5 0 01.9 0l4.44 8.65a.5.5 0 01-.31.7l-5.38 1.2a.5.5 0 01-.4 0z" />
            </svg>
            How to fix
          </div>
          <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">{item.fix}</p>
          {item.codeExample && (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-[11px] leading-relaxed text-neutral-300 border border-neutral-800/60">
              <code>{item.codeExample}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Resource Calculator ────────────────────────────────────────────────────

function ResourceCalculator() {
  const [resources, setResources] = useState<ResourceInputs>({
    html: 50,
    css: 80,
    js: 350,
    images: 800,
    fonts: 60,
    other: 40,
  });

  const totalKB = useMemo(
    () => Object.values(resources).reduce((sum, val) => sum + val, 0),
    [resources]
  );

  const updateResource = (key: keyof ResourceInputs, value: string) => {
    const num = parseInt(value) || 0;
    setResources(prev => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const resourceFields: { key: keyof ResourceInputs; label: string; icon: string }[] = [
    { key: 'html', label: 'HTML', icon: 'H' },
    { key: 'css', label: 'CSS', icon: 'C' },
    { key: 'js', label: 'JavaScript', icon: 'J' },
    { key: 'images', label: 'Images', icon: 'I' },
    { key: 'fonts', label: 'Fonts', icon: 'F' },
    { key: 'other', label: 'Other', icon: 'O' },
  ];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <h3 className="text-lg font-semibold text-white">Resource Size Calculator</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Enter your page resource sizes (KB) to estimate load times across network conditions.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {resourceFields.map(({ key, label, icon }) => (
          <div key={key} className="group">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10 text-[10px] font-bold text-violet-400">
                {icon}
              </span>
              {label}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={resources[key]}
                onChange={(e) => updateResource(key, e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 pr-10 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-600">KB</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-800/50 px-4 py-2.5 border border-neutral-700/50">
        <span className="text-sm font-medium text-neutral-300">Total page weight</span>
        <span className="text-lg font-bold text-white tabular-nums">
          {totalKB >= 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${totalKB} KB`}
        </span>
      </div>

      {/* Load times */}
      <div className="mt-5">
        <h4 className="mb-3 text-sm font-medium text-neutral-400">Estimated load times</h4>
        <div className="space-y-2">
          {NETWORK_SPEEDS.map((speed) => {
            // totalKB in kilobytes -> megabits: KB * 8 / 1024
            const transferMbits = (totalKB * 8) / 1024;
            const transferTime = transferMbits / speed.bandwidth;
            const totalTime = transferTime + speed.latency / 1000;
            const displayTime = totalTime < 1 ? `${Math.round(totalTime * 1000)}ms` : `${totalTime.toFixed(1)}s`;

            return (
              <div key={speed.label} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 border border-neutral-800/50">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${speed.color}`}>{speed.label}</span>
                  <span className="text-[10px] text-neutral-600">({speed.bandwidth} Mbps)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-800 sm:w-32">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (1 / totalTime) * 100)}%`,
                        backgroundColor: totalTime < 2 ? '#22c55e' : totalTime < 5 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`min-w-[3.5rem] text-right text-sm font-mono font-medium tabular-nums ${
                    totalTime < 2 ? 'text-green-400' : totalTime < 5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {displayTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Industry Comparison ────────────────────────────────────────────────────

function IndustryComparison({ userScore }: { userScore: number }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <h3 className="text-lg font-semibold text-white">Industry Benchmarks</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Compare your estimated score against real-world industry averages (median scores from CrUX data).
      </p>

      <div className="mt-5 space-y-3">
        {Object.entries(INDUSTRY_BENCHMARKS).map(([key, bench]) => {
          const diff = userScore - bench.score;
          const isAhead = diff > 0;

          return (
            <div key={key} className="rounded-lg bg-black/30 px-4 py-3 border border-neutral-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{bench.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-neutral-500 tabular-nums">{bench.score}</span>
                  <div className="h-4 w-px bg-neutral-700" />
                  <span className={`text-xs font-semibold ${isAhead ? 'text-green-400' : 'text-red-400'}`}>
                    {isAhead ? '+' : ''}{diff} pts
                  </span>
                </div>
              </div>
              {/* Bar comparison */}
              <div className="mt-2 flex items-center gap-2">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                  {/* Industry bar */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-neutral-600 transition-all duration-500"
                    style={{ width: `${bench.score}%` }}
                  />
                  {/* User bar */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${userScore}%`,
                      backgroundColor: userScore >= 90 ? '#22c55e' : userScore >= 50 ? '#8b5cf6' : '#ef4444',
                    }}
                  />
                </div>
              </div>
              <div className="mt-1.5 flex gap-4 text-[10px] text-neutral-600">
                <span>LCP: {bench.lcp}</span>
                <span>CLS: {bench.cls}</span>
                <span>Weight: {bench.pageWeight}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-violet-500" />
          Your estimate
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-neutral-600" />
          Industry median
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SpeedChecker() {
  const [url, setUrl] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAllFixes, setShowAllFixes] = useState(false);

  // Compute score
  const { score, maxScore } = useMemo(() => {
    const max = CHECKLIST_ITEMS.reduce((sum, item) => sum + item.weight, 0);
    const earned = CHECKLIST_ITEMS
      .filter(item => checkedItems.has(item.id))
      .reduce((sum, item) => sum + item.weight, 0);
    return { score: Math.round((earned / max) * 100), maxScore: max };
  }, [checkedItems]);

  const toggleItem = useCallback((id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAnalyze = () => {
    setHasStarted(true);
  };

  const filteredItems = activeCategory
    ? CHECKLIST_ITEMS.filter(item => item.category === activeCategory)
    : CHECKLIST_ITEMS;

  const uncheckedCount = CHECKLIST_ITEMS.length - checkedItems.size;
  const checkedCount = checkedItems.size;

  const getScoreLabel = (s: number) => {
    if (s >= 90) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 50) return 'Needs Work';
    if (s >= 25) return 'Poor';
    return 'Critical';
  };

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-400';
    if (s >= 70) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    if (s >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  // URL input section (always visible)
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center gap-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-xs font-medium text-violet-400">Free Performance Analyzer</span>
          </div>
          <h1 className="max-w-2xl text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Website Speed Test
          </h1>
          <p className="max-w-xl text-base text-neutral-400 sm:text-lg">
            Audit your website against 25+ performance best practices, estimate your speed score, and get specific fixes with code examples.
          </p>
        </div>

        {/* URL Input */}
        <div className="w-full max-w-xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://example.com"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <button
              onClick={handleAnalyze}
              className="flex h-12 items-center gap-2 rounded-xl bg-violet-600 px-6 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.97]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Analyze
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-neutral-600">
            Enter your URL to begin the performance audit checklist
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: '25+ Checks', desc: 'Comprehensive performance best practices', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { title: 'Score Estimate', desc: 'Gauge your performance 0-100', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
            { title: 'Code Fixes', desc: 'Copy-paste solutions for each issue', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5' },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              <p className="mt-1 text-xs text-neutral-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main audit view
  return (
    <div className="flex flex-col gap-8">
      {/* Top bar: URL + reset */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Performance Audit</h2>
            {url && <p className="text-xs text-neutral-500">{url}</p>}
          </div>
        </div>
        <button
          onClick={() => { setHasStarted(false); setCheckedItems(new Set()); setActiveCategory(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:border-neutral-500 hover:text-white"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          New Audit
        </button>
      </div>

      {/* Score + Stats Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* Score gauge */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <ScoreGauge score={score} />
          <div className="text-center">
            <span className={`text-lg font-bold ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
            <p className="mt-1 text-xs text-neutral-500">
              {checkedCount} of {CHECKLIST_ITEMS.length} checks passed
            </p>
          </div>
          {/* Quick actions */}
          <div className="flex w-full gap-2">
            <button
              onClick={() => setCheckedItems(new Set(CHECKLIST_ITEMS.map(i => i.id)))}
              className="flex-1 rounded-lg bg-green-500/10 py-2 text-xs font-medium text-green-400 transition hover:bg-green-500/20"
            >
              Check All
            </button>
            <button
              onClick={() => setCheckedItems(new Set())}
              className="flex-1 rounded-lg bg-neutral-800 py-2 text-xs font-medium text-neutral-400 transition hover:bg-neutral-700"
            >
              Uncheck All
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-2xl font-bold text-green-400 tabular-nums">{checkedCount}</div>
            <div className="mt-1 text-xs text-neutral-500">Checks Passed</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-2xl font-bold text-red-400 tabular-nums">{uncheckedCount}</div>
            <div className="mt-1 text-xs text-neutral-500">Issues Found</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className={`text-2xl font-bold tabular-nums ${getScoreColor(score)}`}>{score}</div>
            <div className="mt-1 text-xs text-neutral-500">Performance Score</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="text-2xl font-bold text-violet-400 tabular-nums">{CATEGORIES.length}</div>
            <div className="mt-1 text-xs text-neutral-500">Categories</div>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            activeCategory === null
              ? 'bg-violet-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
          }`}
        >
          All ({CHECKLIST_ITEMS.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = CHECKLIST_ITEMS.filter(i => i.category === cat).length;
          const checkedInCat = CHECKLIST_ITEMS.filter(i => i.category === cat && checkedItems.has(i.id)).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {cat}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                checkedInCat === count
                  ? 'bg-green-500/20 text-green-400'
                  : activeCategory === cat
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-700 text-neutral-500'
              }`}>
                {checkedInCat}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {filteredItems.map(item => (
          <ChecklistRow
            key={item.id}
            item={item}
            checked={checkedItems.has(item.id)}
            onToggle={() => toggleItem(item.id)}
          />
        ))}
      </div>

      {/* Show all recommendations for unchecked items */}
      {uncheckedCount > 0 && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {uncheckedCount} Recommendation{uncheckedCount !== 1 ? 's' : ''}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Fix these issues to improve your performance score
              </p>
            </div>
            <button
              onClick={() => setShowAllFixes(!showAllFixes)}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
            >
              {showAllFixes ? 'Collapse All' : 'Show All Fixes'}
            </button>
          </div>

          {showAllFixes && (
            <div className="mt-5 space-y-4">
              {CHECKLIST_ITEMS.filter(item => !checkedItems.has(item.id)).map(item => (
                <div key={item.id} className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-red-500/10 text-[10px] font-bold text-red-400">!</span>
                    <span className="text-sm font-medium text-white">{item.title}</span>
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500">{item.category}</span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{item.fix}</p>
                  {item.codeExample && (
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-[11px] leading-relaxed text-neutral-300 border border-neutral-800/60">
                      <code>{item.codeExample}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resource Calculator + Industry Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ResourceCalculator />
        <IndustryComparison userScore={score} />
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 text-center">
        <h3 className="text-lg font-semibold text-white">Want a faster website?</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-400">
          This tool estimates performance based on best practices. For real metrics, run your URL through Google PageSpeed Insights or Lighthouse in Chrome DevTools.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://pagespeed.web.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            PageSpeed Insights
          </a>
          <a
            href="https://aidxn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
          >
            Hire Aidxn Design
          </a>
        </div>
      </div>
    </div>
  );
}
