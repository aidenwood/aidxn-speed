import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CHECKLIST_ITEMS, CATEGORIES } from '../lib/checklist';
import type { SpeedReport, ResourceRow, ResourceType, Strategy } from '../lib/psi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function scoreTone(score: number | null) {
  if (score === null) return { text: 'text-neutral-500', stroke: '#525252', bg: 'bg-neutral-700' };
  if (score >= 90) return { text: 'text-emerald-400', stroke: '#34d399', bg: 'bg-emerald-500' };
  if (score >= 50) return { text: 'text-amber-400', stroke: '#fbbf24', bg: 'bg-amber-500' };
  return { text: 'text-rose-400', stroke: '#fb7185', bg: 'bg-rose-500' };
}

const TYPE_STYLES: Record<ResourceType, { dot: string; chip: string }> = {
  Image: { dot: 'bg-violet-400', chip: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
  Script: { dot: 'bg-amber-400', chip: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  Stylesheet: { dot: 'bg-sky-400', chip: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  Font: { dot: 'bg-pink-400', chip: 'border-pink-500/30 bg-pink-500/10 text-pink-300' },
  Media: { dot: 'bg-rose-400', chip: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  Document: { dot: 'bg-emerald-400', chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  XHR: { dot: 'bg-teal-400', chip: 'border-teal-500/30 bg-teal-500/10 text-teal-300' },
  Other: { dot: 'bg-neutral-500', chip: 'border-neutral-600 bg-neutral-800 text-neutral-300' },
};

const TYPE_ABBR: Record<ResourceType, string> = {
  Image: 'IMG',
  Script: 'JS',
  Stylesheet: 'CSS',
  Font: 'FNT',
  Media: 'AV',
  Document: 'DOC',
  XHR: 'API',
  Other: '···',
};

const FIELD_TONE: Record<string, string> = {
  FAST: 'text-emerald-400',
  AVERAGE: 'text-amber-400',
  SLOW: 'text-rose-400',
  NONE: 'text-neutral-500',
};

// ─── Small UI pieces ────────────────────────────────────────────────────────

function ScoreRing({ score, label, size = 112 }: { score: number | null; label: string; size?: number }) {
  const tone = scoreTone(score);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const pct = score === null ? 0 : score / 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f1f1f" strokeWidth={8} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - circumference * pct}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${tone.text}`}>
          {score === null ? '—' : score}
        </div>
      </div>
      <span className="text-xs font-medium text-neutral-400">{label}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      title="Copy URL"
      className="rounded-lg border border-neutral-800 p-1.5 text-neutral-500 transition hover:border-neutral-700 hover:text-white"
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
        </svg>
      )}
    </button>
  );
}

// ─── Weight breakdown bar ───────────────────────────────────────────────────

function WeightBar({ report }: { report: SpeedReport }) {
  const total = report.totals.transferSize || 1;
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Page weight by type</p>
        <p className="text-sm font-semibold text-white">{formatBytes(report.totals.transferSize)}</p>
      </div>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-neutral-900">
        {report.totals.types.map((t) => (
          <div
            key={t.type}
            className={TYPE_STYLES[t.type].dot}
            style={{ width: `${(t.transferSize / total) * 100}%` }}
            title={`${t.type} — ${formatBytes(t.transferSize)}`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
        {report.totals.types.map((t) => (
          <div key={t.type} className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_STYLES[t.type].dot}`} />
            <span className="text-neutral-300">{t.type}</span>
            <span className="ml-auto tabular-nums text-neutral-500">{formatBytes(t.transferSize)}</span>
            <span className="w-8 text-right tabular-nums text-neutral-600">{Math.round((t.transferSize / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Resource table ─────────────────────────────────────────────────────────

type SortKey = 'transferSize' | 'duration' | 'wastedBytes' | 'startTime';

function ResourceTable({ report }: { report: SpeedReport }) {
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'All'>('All');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('transferSize');
  const [thirdPartyOnly, setThirdPartyOnly] = useState(false);
  const [limit, setLimit] = useState(50);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = report.resources.filter((r) => {
      if (typeFilter !== 'All' && r.type !== typeFilter) return false;
      if (thirdPartyOnly && !r.thirdParty) return false;
      if (q && !r.url.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [report.resources, typeFilter, query, sortKey, thirdPartyOnly]);

  const maxValue = rows.length ? (rows[0][sortKey] as number) || 1 : 1;
  const pageEnd = Math.max(...report.resources.map((r) => r.endTime), 1);
  const visible = rows.slice(0, limit);
  const filteredBytes = rows.reduce((s, r) => s + r.transferSize, 0);

  useEffect(() => setLimit(50), [typeFilter, query, sortKey, thirdPartyOnly]);

  const typeChips: (ResourceType | 'All')[] = ['All', ...report.totals.types.map((t) => t.type)];

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {typeChips.map((t) => {
            const active = typeFilter === t;
            const count = t === 'All' ? report.totals.requests : report.totals.types.find((x) => x.type === t)?.count ?? 0;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-violet-500 bg-violet-500/15 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white'
                }`}
              >
                {t !== 'All' && <span className={`h-1.5 w-1.5 rounded-full ${TYPE_STYLES[t as ResourceType].dot}`} />}
                {t}
                <span className="tabular-nums text-neutral-500">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <button
            onClick={() => setThirdPartyOnly((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              thirdPartyOnly
                ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            3rd party only
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by URL…"
            className="h-9 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none transition placeholder:text-neutral-600 focus:border-violet-500 sm:w-56"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-violet-500"
          >
            <option value="transferSize">Sort: heaviest</option>
            <option value="duration">Sort: slowest</option>
            <option value="wastedBytes">Sort: most wasted</option>
            <option value="startTime">Sort: load order</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        {rows.length} of {report.totals.requests} requests · {formatBytes(filteredBytes)}
      </p>

      {/* Rows */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
        {visible.map((r, i) => (
          <ResourceRowView key={`${r.url}-${i}`} row={r} rank={i + 1} metric={sortKey} maxValue={maxValue} pageEnd={pageEnd} />
        ))}
        {!visible.length && <p className="p-8 text-center text-sm text-neutral-500">No requests match that filter.</p>}
      </div>

      {limit < rows.length && (
        <button
          onClick={() => setLimit((l) => l + 100)}
          className="mx-auto rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
        >
          Show {Math.min(100, rows.length - limit)} more ({rows.length - limit} hidden)
        </button>
      )}
    </div>
  );
}

function ResourceRowView({
  row,
  rank,
  metric,
  maxValue,
  pageEnd,
}: {
  row: ResourceRow;
  rank: number;
  metric: SortKey;
  maxValue: number;
  pageEnd: number;
}) {
  const style = TYPE_STYLES[row.type];
  const value = row[metric] as number;
  const barPct = Math.max(1, (value / maxValue) * 100);
  const isError = row.statusCode >= 400;

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-neutral-900 px-4 py-3 transition last:border-0 hover:bg-neutral-900/40">
      {/* Thumbnail / rank */}
      <div className="flex items-center gap-3">
        <span className="w-6 text-right text-xs tabular-nums text-neutral-600">{rank}</span>
        {row.type === 'Image' ? (
          <img
            src={row.url}
            alt=""
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-lg border border-neutral-800 bg-neutral-900 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ) : (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-[11px] font-bold ${style.chip.split(' ').pop()}`}>
            {TYPE_ABBR[row.type]}
          </span>
        )}
      </div>

      {/* Name + meta + waterfall */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate text-sm font-medium text-neutral-200 underline-offset-2 hover:text-violet-300 hover:underline"
            title={row.url}
          >
            {row.file}
          </a>
          <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${style.chip}`}>
            {row.type}
          </span>
          {row.thirdParty && (
            <span className="shrink-0 rounded-md border border-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
              3rd party
            </span>
          )}
          {isError && (
            <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              {row.statusCode}
            </span>
          )}
          <CopyButton text={row.url} />
        </div>

        <p className="mt-0.5 truncate text-xs text-neutral-500" title={row.url}>
          {row.host} · {row.protocol || '—'} · {formatMs(row.duration)}
          {row.wastedBytes > 0 && (
            <span className="text-amber-400/90">
              {' '}
              · {formatBytes(row.wastedBytes)} wasted ({row.wastedReasons.join(', ')})
            </span>
          )}
        </p>

        {/* waterfall */}
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-900">
          <div
            className={`absolute h-full rounded-full ${style.dot} opacity-80`}
            style={{
              left: `${Math.min(97, (row.startTime / pageEnd) * 100)}%`,
              width: `${Math.max(1.5, (row.duration / pageEnd) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Size */}
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-white">{formatBytes(row.transferSize)}</p>
        {row.resourceSize > row.transferSize && (
          <p className="text-[11px] tabular-nums text-neutral-600">{formatBytes(row.resourceSize)} raw</p>
        )}
        <div className="mt-1.5 ml-auto h-1 w-20 overflow-hidden rounded-full bg-neutral-900">
          <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${barPct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Opportunities ──────────────────────────────────────────────────────────

function OpportunityList({ report }: { report: SpeedReport }) {
  const [open, setOpen] = useState<string | null>(null);
  const all = [...report.opportunities, ...report.diagnostics];

  if (!all.length) {
    return <p className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center text-sm text-neutral-500">Nothing flagged — clean run.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {all.map((o) => {
        const tone = scoreTone(o.score === null ? null : Math.round(o.score * 100));
        const isOpen = open === o.id;
        return (
          <div key={o.id} className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
            <button
              onClick={() => setOpen(isOpen ? null : o.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-neutral-900/50"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.bg}`} />
              <span className="flex-1 text-sm font-medium text-neutral-100">{o.title}</span>
              {o.savingsBytes > 0 && (
                <span className="hidden shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-300 sm:inline">
                  −{formatBytes(o.savingsBytes)}
                </span>
              )}
              {o.savingsMs > 0 && (
                <span className="shrink-0 rounded-lg border border-neutral-700 px-2 py-1 text-xs font-medium tabular-nums text-neutral-300">
                  {o.displayValue || `${formatMs(o.savingsMs)}`}
                </span>
              )}
              <svg
                className={`h-4 w-4 shrink-0 text-neutral-500 transition ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {isOpen && (
              <div className="border-t border-neutral-900 px-5 py-4">
                <p className="text-sm leading-relaxed text-neutral-400">{o.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Checklist (auto-answered from the audit) ───────────────────────────────

function Checklist({ report }: { report: SpeedReport }) {
  const [manual, setManual] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string | null>(null);

  const isChecked = useCallback(
    (id: string) => (id in report.autoChecks ? report.autoChecks[id] : manual.has(id)),
    [report.autoChecks, manual],
  );

  const { score } = useMemo(() => {
    const max = CHECKLIST_ITEMS.reduce((s, i) => s + i.weight, 0);
    const earned = CHECKLIST_ITEMS.filter((i) => isChecked(i.id)).reduce((s, i) => s + i.weight, 0);
    return { score: Math.round((earned / max) * 100) };
  }, [isChecked]);

  const items = category ? CHECKLIST_ITEMS.filter((i) => i.category === category) : CHECKLIST_ITEMS;
  const tone = scoreTone(score);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <ScoreRing score={score} label="Checklist" size={88} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            {CHECKLIST_ITEMS.filter((i) => isChecked(i.id)).length} of {CHECKLIST_ITEMS.length} practices in place
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {Object.keys(report.autoChecks).length} answered automatically from the audit. The rest are yours to tick.
          </p>
        </div>
        <span className={`text-sm font-semibold ${tone.text}`}>{score}/100</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            category === null ? 'border-violet-500 bg-violet-500/15 text-white' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
          }`}
        >
          All ({CHECKLIST_ITEMS.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              category === c ? 'border-violet-500 bg-violet-500/15 text-white' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const checked = isChecked(item.id);
          const auto = item.id in report.autoChecks;
          return (
            <details key={item.id} className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
              <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 transition hover:bg-neutral-900/50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (auto) return;
                    setManual((prev) => {
                      const next = new Set(prev);
                      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                      return next;
                    });
                  }}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    checked ? 'border-emerald-500 bg-emerald-500/20' : 'border-neutral-700'
                  } ${auto ? 'cursor-default' : ''}`}
                  title={auto ? 'Answered by the audit' : 'Toggle manually'}
                >
                  {checked && (
                    <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${checked ? 'text-neutral-400 line-through' : 'text-white'}`}>{item.title}</span>
                    {auto && (
                      <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-300">
                        auto
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{item.description}</p>
                </div>
              </summary>
              <div className="border-t border-neutral-900 px-5 py-4">
                <p className="text-sm text-neutral-300">
                  <span className="font-semibold text-white">Fix: </span>
                  {item.fix}
                </p>
                {item.codeExample && (
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-neutral-800 bg-black p-4 text-xs leading-relaxed text-neutral-300">
                    <code>{item.codeExample}</code>
                  </pre>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

type Tab = 'resources' | 'opportunities' | 'checklist';

export default function SpeedChecker() {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SpeedReport | null>(null);
  const [tab, setTab] = useState<Tab>('resources');

  const analyze = useCallback(
    async (target: string, strat: Strategy) => {
      if (!target.trim()) {
        setError('Enter a URL first.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analyze?url=${encodeURIComponent(target.trim())}&strategy=${strat}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed.');
        setReport(data as SpeedReport);
        setTab('resources');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const switchStrategy = (s: Strategy) => {
    setStrategy(s);
    if (report) analyze(url, s);
  };

  // ── Landing ───────────────────────────────────────────────────────────────
  if (!report) {
    return (
      <div className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-xs font-medium text-violet-400">Live Lighthouse audit</span>
          </div>
          <h1 className="max-w-2xl text-3xl font-bold text-white sm:text-4xl md:text-5xl">Website Speed Test</h1>
          <p className="max-w-xl text-base text-neutral-400 sm:text-lg">
            Real Lighthouse run against your URL — every request ranked by weight, with direct links to the files slowing you down.
          </p>
        </div>

        <div className="w-full max-w-xl">
          <div className="flex flex-col gap-2 sm:flex-row">
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
                onKeyDown={(e) => e.key === 'Enter' && analyze(url, strategy)}
                disabled={loading}
                placeholder="https://example.com"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => analyze(url, strategy)}
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.97] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analysing…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Analyse
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            {(['mobile', 'desktop'] as Strategy[]).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                  strategy === s ? 'border-violet-500 bg-violet-500/15 text-white' : 'border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading && (
            <p className="mt-4 text-center text-xs text-neutral-500">
              Running a real Lighthouse pass on Google's infrastructure — usually 15–40 seconds.
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-300">{error}</p>
          )}
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: 'Every request, ranked', body: 'Images, scripts, fonts and third parties sorted by transfer weight with direct links.' },
            { title: 'Real Core Web Vitals', body: 'Lab metrics plus field data from real Chrome users where Google has it.' },
            { title: 'Wasted bytes per file', body: 'Unused JS/CSS and unoptimised images attributed to the exact URL.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const heaviest = report.resources[0];
  const totalWasted = report.resources.reduce((s, r) => s + r.wastedBytes, 0);

  // A preview/staging URL that bounces to a login screen audits the login screen —
  // surface that instead of letting the numbers quietly describe the wrong page.
  let redirectedHost: string | null = null;
  try {
    const asked = new URL(report.url).hostname.replace(/^www\./, '');
    const landed = new URL(report.finalUrl).hostname.replace(/^www\./, '');
    if (asked && landed && asked !== landed) redirectedHost = landed;
  } catch {
    /* ignore */
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 lg:flex-row lg:items-center">
        {report.screenshot && (
          <img src={report.screenshot} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-neutral-800 object-cover object-top" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Performance audit</p>
          <a
            href={report.finalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="block truncate text-base font-semibold text-white hover:text-violet-300"
          >
            {report.finalUrl}
          </a>
          <p className="mt-1 text-xs text-neutral-600">
            {new Date(report.fetchedAt).toLocaleString('en-AU')} · {report.strategy} · Lighthouse via PageSpeed Insights
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-xl border border-neutral-800 p-1">
            {(['mobile', 'desktop'] as Strategy[]).map((s) => (
              <button
                key={s}
                onClick={() => switchStrategy(s)}
                disabled={loading}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  report.strategy === s ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setReport(null);
              setError(null);
            }}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
          >
            New audit
          </button>
        </div>
      </div>

      {redirectedHost && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
          That URL redirected to <span className="font-semibold">{redirectedHost}</span> — these numbers describe the page you landed on
          (often a login or consent screen), not the site you entered.
        </div>
      )}
      {loading && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm text-violet-200">Re-running on {strategy}…</div>
      )}
      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-300">{error}</div>}

      {/* Scores */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          {report.categories.map((c) => (
            <ScoreRing key={c.id} score={c.score} label={c.label} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Page weight"
            value={formatBytes(report.totals.transferSize)}
            sub={
              report.totals.resourceSize > report.totals.transferSize
                ? `${formatBytes(report.totals.resourceSize)} uncompressed`
                : 'transferred over the wire'
            }
          />
          <StatCard label="Requests" value={String(report.totals.requests)} sub={`${report.totals.thirdPartyRequests} third-party`} />
          <StatCard label="Wasted bytes" value={formatBytes(totalWasted)} sub="unused JS/CSS + unoptimised media" />
          <StatCard label="Third-party weight" value={formatBytes(report.totals.thirdPartyBytes)} sub={`${Math.round((report.totals.thirdPartyBytes / (report.totals.transferSize || 1)) * 100)}% of page`} />
          {heaviest && <StatCard label="Heaviest file" value={formatBytes(heaviest.transferSize)} sub={heaviest.file} />}
          <StatCard
            label="Field data"
            value={report.field.available ? (report.field.overall ?? '—') : 'None'}
            sub={report.field.available ? 'real Chrome users (CrUX)' : 'not enough traffic yet'}
          />
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {report.metrics.map((m) => {
          const tone = scoreTone(m.score === null ? null : Math.round(m.score * 100));
          return (
            <div key={m.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500" title={m.label}>
                {m.label}
              </p>
              <p className={`mt-1.5 text-xl font-bold tabular-nums ${tone.text}`}>{m.value}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-900">
                <div className={`h-full rounded-full ${tone.bg}`} style={{ width: `${Math.round((m.score ?? 0) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Field data */}
      {report.field.available && report.field.metrics.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Real-user data (28 days)</p>
          {report.field.metrics.map((f) => (
            <div key={f.id} className="flex items-baseline gap-2">
              <span className="text-xs text-neutral-400">{f.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${FIELD_TONE[f.category] ?? 'text-neutral-300'}`}>
                {f.unit === 'ms' ? formatMs(f.value) : f.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <WeightBar report={report} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-neutral-800 bg-neutral-950 p-1">
        {([
          ['resources', `Resources (${report.totals.requests})`],
          ['opportunities', `Opportunities (${report.opportunities.length + report.diagnostics.length})`],
          ['checklist', 'Checklist'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              tab === id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resources' && <ResourceTable report={report} />}
      {tab === 'opportunities' && <OpportunityList report={report} />}
      {tab === 'checklist' && <Checklist report={report} />}
    </div>
  );
}
