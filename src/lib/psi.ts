// PageSpeed Insights → trimmed, GTmetrix-shaped report.
// Runs server-side only (needs PSI_API_KEY).

export type Strategy = 'mobile' | 'desktop';

export type ResourceType =
  | 'Document'
  | 'Stylesheet'
  | 'Script'
  | 'Image'
  | 'Font'
  | 'Media'
  | 'XHR'
  | 'Other';

export interface ResourceRow {
  url: string;
  host: string;
  file: string;
  type: ResourceType;
  mimeType: string;
  transferSize: number;
  resourceSize: number;
  statusCode: number;
  protocol: string;
  startTime: number;
  endTime: number;
  duration: number;
  thirdParty: boolean;
  /** bytes PSI says are wasted on this URL (unused JS/CSS, unoptimised image, …) */
  wastedBytes: number;
  wastedReasons: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  displayValue: string;
  savingsMs: number;
  savingsBytes: number;
  score: number | null;
}

export interface MetricRow {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  score: number | null;
  /** good / needs-improvement / poor thresholds, in the metric's own unit */
  good: number;
  poor: number;
  unit: 'ms' | 'score';
}

export interface TypeTotal {
  type: ResourceType;
  count: number;
  transferSize: number;
}

export interface SpeedReport {
  url: string;
  finalUrl: string;
  strategy: Strategy;
  fetchedAt: string;
  screenshot: string | null;
  categories: { id: string; label: string; score: number | null }[];
  metrics: MetricRow[];
  field: {
    available: boolean;
    overall: string | null;
    metrics: { id: string; label: string; value: number; category: string; unit: string }[];
  };
  totals: {
    requests: number;
    transferSize: number;
    resourceSize: number;
    types: TypeTotal[];
    thirdPartyBytes: number;
    thirdPartyRequests: number;
  };
  resources: ResourceRow[];
  opportunities: Opportunity[];
  diagnostics: Opportunity[];
  /** ids of checklist items PSI can answer for us */
  autoChecks: Record<string, boolean>;
}

const TYPE_MAP: Record<string, ResourceType> = {
  Document: 'Document',
  Stylesheet: 'Stylesheet',
  Script: 'Script',
  Image: 'Image',
  Font: 'Font',
  Media: 'Media',
  XHR: 'XHR',
  Fetch: 'XHR',
  EventSource: 'XHR',
  WebSocket: 'XHR',
  Manifest: 'Other',
  Other: 'Other',
};

function classify(item: any): ResourceType {
  // Lighthouse labels a lot of real scripts/styles as resourceType "Other"
  // (262 of 391 on one Framer page), so the MIME type wins when it is specific.
  const rt = item.resourceType as string | undefined;
  if (rt && rt !== 'Other' && TYPE_MAP[rt]) return TYPE_MAP[rt];
  const mime = (item.mimeType as string | undefined) ?? '';
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('font/') || mime.includes('woff')) return 'Font';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'Media';
  if (mime.includes('javascript')) return 'Script';
  if (mime.includes('css')) return 'Stylesheet';
  if (mime.includes('html')) return 'Document';
  return 'Other';
}

function fileNameOf(u: URL): string {
  const last = u.pathname.split('/').filter(Boolean).pop();
  return last || u.hostname;
}

const METRIC_DEFS: { id: string; label: string; good: number; poor: number; unit: 'ms' | 'score' }[] = [
  { id: 'largest-contentful-paint', label: 'Largest Contentful Paint', good: 2500, poor: 4000, unit: 'ms' },
  { id: 'first-contentful-paint', label: 'First Contentful Paint', good: 1800, poor: 3000, unit: 'ms' },
  { id: 'total-blocking-time', label: 'Total Blocking Time', good: 200, poor: 600, unit: 'ms' },
  { id: 'cumulative-layout-shift', label: 'Cumulative Layout Shift', good: 0.1, poor: 0.25, unit: 'score' },
  { id: 'speed-index', label: 'Speed Index', good: 3400, poor: 5800, unit: 'ms' },
  { id: 'interactive', label: 'Time to Interactive', good: 3800, poor: 7300, unit: 'ms' },
];

const FIELD_LABELS: Record<string, { label: string; unit: string }> = {
  LARGEST_CONTENTFUL_PAINT_MS: { label: 'LCP', unit: 'ms' },
  FIRST_CONTENTFUL_PAINT_MS: { label: 'FCP', unit: 'ms' },
  INTERACTION_TO_NEXT_PAINT: { label: 'INP', unit: 'ms' },
  CUMULATIVE_LAYOUT_SHIFT_SCORE: { label: 'CLS', unit: 'score' },
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: { label: 'TTFB', unit: 'ms' },
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
};

/** audits whose details carry per-URL wasted bytes we can fold into the resource table */
const WASTE_AUDITS: Record<string, string> = {
  'unused-javascript': 'Unused JS',
  'unused-css-rules': 'Unused CSS',
  'unminified-javascript': 'Unminified JS',
  'unminified-css': 'Unminified CSS',
  'modern-image-formats': 'Not WebP/AVIF',
  'uses-optimized-images': 'Unoptimised image',
  'uses-responsive-images': 'Oversized image',
  'efficient-animated-content': 'Heavy animated media',
  'uses-text-compression': 'No gzip/brotli',
  'duplicated-javascript': 'Duplicated JS',
  'legacy-javascript': 'Legacy JS polyfills',
};

const DIAGNOSTIC_IDS = [
  'server-response-time',
  'render-blocking-resources',
  'uses-long-cache-ttl',
  'font-display',
  'third-party-summary',
  'dom-size',
  'bootup-time',
  'mainthread-work-breakdown',
  'network-requests',
  'critical-request-chains',
  'largest-contentful-paint-element',
  'layout-shift-elements',
];

function auditToOpportunity(id: string, audit: any): Opportunity | null {
  if (!audit) return null;
  const d = audit.details ?? {};
  const savingsMs = Number(d.overallSavingsMs ?? audit.numericValue ?? 0) || 0;
  const savingsBytes = Number(d.overallSavingsBytes ?? 0) || 0;
  return {
    id,
    title: audit.title ?? id,
    description: audit.description ?? '',
    displayValue: audit.displayValue ?? '',
    savingsMs,
    savingsBytes,
    score: audit.score ?? null,
  };
}

export function buildReport(raw: any, strategy: Strategy): SpeedReport {
  const lr = raw.lighthouseResult ?? {};
  const audits = lr.audits ?? {};

  // ── waste per URL ─────────────────────────────────────────────────────────
  const waste = new Map<string, { bytes: number; reasons: Set<string> }>();
  for (const [id, label] of Object.entries(WASTE_AUDITS)) {
    const items = audits[id]?.details?.items;
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      const u = it.url ?? it.source?.url;
      if (typeof u !== 'string' || !u.startsWith('http')) continue;
      const bytes = Number(it.wastedBytes ?? it.totalBytes ?? 0) || 0;
      const entry = waste.get(u) ?? { bytes: 0, reasons: new Set<string>() };
      entry.bytes += bytes;
      entry.reasons.add(label);
      waste.set(u, entry);
    }
  }

  // ── resources ─────────────────────────────────────────────────────────────
  const netItems: any[] = audits['network-requests']?.details?.items ?? [];
  const finalUrl: string = lr.finalDisplayedUrl ?? lr.finalUrl ?? raw.id ?? '';
  let pageHost = '';
  try {
    pageHost = new URL(finalUrl).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }

  const resources: ResourceRow[] = netItems
    .filter((i) => typeof i.url === 'string' && i.url.startsWith('http'))
    .map((i) => {
      let u: URL;
      try {
        u = new URL(i.url);
      } catch {
        return null;
      }
      const host = u.hostname.replace(/^www\./, '');
      const start = Number(i.networkRequestTime ?? 0) || 0;
      const end = Number(i.networkEndTime ?? 0) || 0;
      const w = waste.get(i.url);
      return {
        url: i.url,
        host,
        file: fileNameOf(u),
        type: classify(i),
        mimeType: i.mimeType ?? '',
        transferSize: Number(i.transferSize ?? 0) || 0,
        resourceSize: Number(i.resourceSize ?? 0) || 0,
        statusCode: Number(i.statusCode ?? 0) || 0,
        protocol: i.protocol ?? '',
        startTime: start,
        endTime: end,
        duration: Math.max(0, end - start),
        thirdParty: Boolean(pageHost) && !host.endsWith(pageHost),
        wastedBytes: w?.bytes ?? 0,
        wastedReasons: w ? [...w.reasons] : [],
      } as ResourceRow;
    })
    .filter(Boolean) as ResourceRow[];

  resources.sort((a, b) => b.transferSize - a.transferSize);

  const typeTotalsMap = new Map<ResourceType, TypeTotal>();
  for (const r of resources) {
    const t = typeTotalsMap.get(r.type) ?? { type: r.type, count: 0, transferSize: 0 };
    t.count += 1;
    t.transferSize += r.transferSize;
    typeTotalsMap.set(r.type, t);
  }
  const types = [...typeTotalsMap.values()].sort((a, b) => b.transferSize - a.transferSize);

  // ── lab metrics ───────────────────────────────────────────────────────────
  const metrics: MetricRow[] = METRIC_DEFS.filter((m) => audits[m.id]).map((m) => ({
    id: m.id,
    label: m.label,
    value: audits[m.id].displayValue ?? '—',
    numericValue: Number(audits[m.id].numericValue ?? 0) || 0,
    score: audits[m.id].score ?? null,
    good: m.good,
    poor: m.poor,
    unit: m.unit,
  }));

  // ── field data (CrUX) ─────────────────────────────────────────────────────
  const le = raw.loadingExperience ?? {};
  const fieldMetrics = Object.entries(le.metrics ?? {})
    .filter(([k]) => FIELD_LABELS[k])
    .map(([k, v]: [string, any]) => ({
      id: k,
      label: FIELD_LABELS[k].label,
      value: FIELD_LABELS[k].unit === 'score' ? v.percentile / 100 : v.percentile,
      category: v.category,
      unit: FIELD_LABELS[k].unit,
    }));

  // ── opportunities + diagnostics ───────────────────────────────────────────
  const opportunities: Opportunity[] = Object.entries(audits)
    .filter(([, a]: [string, any]) => a?.details?.type === 'opportunity' && (a.score ?? 1) < 1)
    .map(([id, a]) => auditToOpportunity(id, a))
    .filter(Boolean)
    .sort((a, b) => (b!.savingsMs - a!.savingsMs) || (b!.savingsBytes - a!.savingsBytes)) as Opportunity[];

  const diagnostics: Opportunity[] = DIAGNOSTIC_IDS.map((id) => auditToOpportunity(id, audits[id]))
    .filter((o): o is Opportunity => Boolean(o) && o!.score !== null && o!.score! < 1);

  // ── checklist auto-answers ────────────────────────────────────────────────
  const pass = (id: string) => (audits[id]?.score ?? null) === 1;
  // keys match CHECKLIST_ITEMS ids in SpeedChecker.tsx
  const autoChecks: Record<string, boolean> = {
    webp: pass('modern-image-formats'),
    'lazy-loading': pass('offscreen-images'),
    srcset: pass('uses-responsive-images'),
    'image-dimensions': pass('unsized-images'),
    'minify-css': pass('unminified-css'),
    'minify-js': pass('unminified-javascript'),
    'critical-css': pass('render-blocking-resources'),
    'defer-js': pass('render-blocking-resources'),
    'code-splitting': pass('unused-javascript'),
    compression: pass('uses-text-compression'),
    caching: pass('uses-long-cache-ttl'),
    'reduce-redirects': pass('redirects'),
    preconnect: pass('uses-rel-preconnect'),
    'font-display': pass('font-display'),
    lcp: (audits['largest-contentful-paint']?.score ?? 0) >= 0.9,
    inp: (audits['total-blocking-time']?.score ?? 0) >= 0.9,
    cls: (audits['cumulative-layout-shift']?.score ?? 0) >= 0.9,
    'dom-size': pass('dom-size'),
    'third-party-audit': (audits['third-party-summary']?.score ?? null) === 1,
    'above-fold': (audits['first-contentful-paint']?.score ?? 0) >= 0.9,
  };

  const totals = {
    requests: resources.length,
    transferSize: resources.reduce((s, r) => s + r.transferSize, 0),
    resourceSize: resources.reduce((s, r) => s + r.resourceSize, 0),
    types,
    thirdPartyBytes: resources.filter((r) => r.thirdParty).reduce((s, r) => s + r.transferSize, 0),
    thirdPartyRequests: resources.filter((r) => r.thirdParty).length,
  };

  return {
    url: raw.id ?? finalUrl,
    finalUrl,
    strategy,
    fetchedAt: lr.fetchTime ?? new Date().toISOString(),
    screenshot: audits['final-screenshot']?.details?.data ?? null,
    categories: Object.entries(lr.categories ?? {}).map(([id, c]: [string, any]) => ({
      id,
      label: CATEGORY_LABELS[id] ?? c.title ?? id,
      score: c.score === null || c.score === undefined ? null : Math.round(c.score * 100),
    })),
    metrics,
    field: {
      available: Boolean(le.metrics),
      overall: le.overall_category ?? null,
      metrics: fieldMetrics,
    },
    totals,
    resources,
    opportunities,
    diagnostics,
    autoChecks,
  };
}

export async function runPsi(url: string, strategy: Strategy, apiKey?: string): Promise<SpeedReport> {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', strategy);
  for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) {
    endpoint.searchParams.append('category', c);
  }
  if (apiKey) endpoint.searchParams.set('key', apiKey);

  const res = await fetch(endpoint, { headers: { accept: 'application/json' } });
  const raw = await res.json();

  if (!res.ok) {
    const msg = raw?.error?.message ?? `PageSpeed Insights returned ${res.status}`;
    throw new Error(msg);
  }

  return buildReport(raw, strategy);
}
