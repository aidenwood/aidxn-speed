import type { APIRoute } from 'astro';
import { runPsi, type Strategy } from '../../lib/psi';

export const prerender = false;

function normalise(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter a URL to analyse.');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const u = new URL(withProtocol);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http and https URLs can be analysed.');
  if (!u.hostname.includes('.')) throw new Error('That does not look like a public hostname.');
  return u.toString();
}

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('url') ?? '';
  const strategy = (url.searchParams.get('strategy') ?? 'mobile') as Strategy;

  try {
    const clean = normalise(target);
    const apiKey = import.meta.env.PSI_API_KEY ?? process.env.PSI_API_KEY;
    const report = await runPsi(clean, strategy === 'desktop' ? 'desktop' : 'mobile', apiKey);
    return new Response(JSON.stringify(report), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
};
