import axios from 'axios';
import { CompanyProject } from '../../models/CompanyProject.model.js';

const KEYWORDS = [
  'project', 'projects', 'case studies', 'case-study', 'case_study', 'portfolio',
  'our work', 'success stor', 'client stories', 'customer stories', 'solutions',
  'services', 'products', 'news', 'press', 'announcement', 'insights', 'industries'
];

const COMMON_PATHS = [
  '/projects', '/project', '/portfolio', '/case-studies', '/case-study', '/our-work',
  '/success-stories', '/customer-stories', '/client-stories', '/solutions', '/services',
  '/products', '/news', '/press-releases', '/announcements', '/insights'
];

function stripHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html = '', name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  return re.exec(html)?.[1] || '';
}

function extractTitle(html = '') {
  return stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '') || stripHtml(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || '');
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && links.length < 100) {
    const text = stripHtml(match[2]);
    if (!text) continue;
    try {
      const url = new URL(match[1], baseUrl);
      const base = new URL(baseUrl);
      if (url.hostname !== base.hostname) continue;
      links.push({ url: url.href, text });
    } catch {}
  }
  return links;
}

async function getHtml(url, timeout = 12000) {
  const response = await axios.get(url, {
    timeout,
    maxContentLength: 2_000_000,
    headers: { 'User-Agent': 'LeadExtractorCompanyResearch/2.0' },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  return String(response.data || '');
}

async function discoverSitemapUrls(website) {
  const urls = new Set();
  const origin = new URL(website).origin;
  for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const xml = await getHtml(`${origin}${path}`, 8000);
      const matches = xml.match(/<loc>([^<]+)<\/loc>/gi) || [];
      for (const item of matches.slice(0, 100)) {
        const url = item.replace(/<\/?loc>/gi, '').trim();
        if (url) urls.add(url);
      }
      if (urls.size) break;
    } catch {}
  }
  return [...urls];
}

export async function researchCompany(company) {
  if (!company.website) return { projects: [], sources: [] };
  const website = company.website.startsWith('http') ? company.website : `https://${company.website}`;
  const base = new URL(website);
  let homeHtml = '';
  try {
    homeHtml = await getHtml(website);
  } catch (err) {
    return { projects: [], sources: [], error: `Website research failed: ${err.message}` };
  }

  const links = extractLinks(homeHtml, website);
  const candidates = new Map();
  const addCandidate = (url, text = '') => {
    try {
      const parsed = new URL(url, website);
      if (parsed.hostname !== base.hostname) return;
      const normalized = parsed.href.replace(/#.*$/, '').replace(/\/$/, '');
      if (normalized === website.replace(/\/$/, '')) return;
      const haystack = `${text} ${normalized}`.toLowerCase();
      if (KEYWORDS.some((keyword) => haystack.includes(keyword))) candidates.set(normalized, { url: normalized, text });
    } catch {}
  };

  links.forEach((link) => addCandidate(link.url, link.text));
  COMMON_PATHS.forEach((path) => addCandidate(`${base.origin}${path}`, path.slice(1).replace(/-/g, ' ')));

  const sitemapUrls = await discoverSitemapUrls(website);
  sitemapUrls.forEach((url) => addCandidate(url, url));

  const projects = [];
  for (const candidate of [...candidates.values()].slice(0, 20)) {
    try {
      const html = await getHtml(candidate.url, 10000);
      const title = extractTitle(html) || candidate.text || candidate.url;
      const description = extractMeta(html, 'description') || stripHtml(html).slice(0, 900);
      projects.push({
        name: title.slice(0, 180),
        description: description.slice(0, 1000),
        sourceUrl: candidate.url,
        sourceName: new URL(candidate.url).hostname,
        confidence: 'medium',
      });
    } catch {}
  }

  const unique = [];
  const seen = new Set();
  for (const item of projects) {
    const key = `${item.name}|${item.sourceUrl}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  for (const project of unique) {
    await CompanyProject.updateOne(
      { companyId: company._id, name: project.name, sourceUrl: project.sourceUrl },
      { $set: project, $setOnInsert: { companyId: company._id } },
      { upsert: true }
    );
  }

  return { projects: unique, sources: [...candidates.values()].map((c) => c.url) };
}
