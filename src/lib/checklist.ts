export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  weight: number; // 1-5, how much this impacts score
  description: string;
  fix: string;
  codeExample?: string;
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
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

export const CATEGORIES = [...new Set(CHECKLIST_ITEMS.map(item => item.category))];
