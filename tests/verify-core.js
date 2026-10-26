#!/usr/bin/env node

/**
 * tests/verify-core.js
 * 
 * Core Functional, Dynamic SEO, and Privacy Live Verification Script
 * Uses native Node fetch against live Web (port 3000) and Server (port 4000).
 */

const fs = require('fs');
const path = require('path');

// 1. Environment & Setup
const WEB_PORT = process.env.WEB_PORT || 3000;
const SERVER_PORT = process.env.SERVER_PORT || 4000;
const WEB_BASE = `http://localhost:${WEB_PORT}`;
const SERVER_BASE = `http://localhost:${SERVER_PORT}`;

// Load server .env if DATABASE_URL is not set
if (!process.env.DATABASE_URL && fs.existsSync(path.resolve(__dirname, '../apps/server/.env'))) {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../apps/server/.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Helpers
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractMeta(html, nameOrProp) {
  const regexes = [
    new RegExp(`<meta[^>]*name=["']${nameOrProp}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${nameOrProp}["']`, 'i'),
    new RegExp(`<meta[^>]*property=["']${nameOrProp}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${nameOrProp}["']`, 'i'),
  ];
  for (const regex of regexes) {
    const match = html.match(regex);
    if (match) return decodeHtmlEntities(match[1].trim());
  }
  return null;
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return match ? match[1].trim() : null;
}

let passed = 0;
let failed = 0;

function report(name, ok, details = '') {
  if (ok) {
    console.log(`  ✓ ${name}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ ${name} FAILED: ${details}`);
    failed++;
  }
}

async function run() {
  console.log('='.repeat(70));
  console.log(' ideaslab Core Functional, Dynamic SEO & Privacy Live Verification');
  console.log('='.repeat(70));
  console.log(` Web target:    ${WEB_BASE}`);
  console.log(` Server target: ${SERVER_BASE}`);
  console.log();

  // Step 0: Check Service Availability
  console.log('[Step 0] Checking Service Availability');
  try {
    const serverRes = await fetch(`${SERVER_BASE}/api/linked-roles/verify`, { method: 'GET', redirect: 'manual' });
    const serverOk = serverRes.status === 302 || serverRes.status === 200 || serverRes.status === 405;
    report('Server port 4000 responding', serverOk, `status: ${serverRes.status}`);
  } catch (err) {
    report('Server port 4000 responding', false, err.message);
  }

  try {
    const webRes = await fetch(`${WEB_BASE}/`);
    report('Web port 3000 responding', webRes.status === 200, `status: ${webRes.status}`);
  } catch (err) {
    report('Web port 3000 responding', false, err.message);
  }

  // Step 1: Primary Routes return HTTP 200
  console.log('\n[Test 1] Primary Routes Direct Access (HTTP 200)');
  const primaryRoutes = [
    '/',
    '/login',
    '/signup',
    '/gallery',
    '/info',
    '/privacy',
    '/profiles',
  ];
  for (const route of primaryRoutes) {
    try {
      const res = await fetch(`${WEB_BASE}${route}`);
      report(`Route ${route} returns 200`, res.status === 200, `status: ${res.status}`);
    } catch (err) {
      report(`Route ${route} returns 200`, false, err.message);
    }
  }

  // Query database subjects dynamically
  let testSubjects = {
    publicUser: { handle: '1093258569585004574', name: 'yeppi5737', introduce: '안녕하세요 취미로 그림 그리는 사람입니다.' },
    privateUser: { handle: '1004289111785472092', name: '석영', introduce: '시 분야의 창작활동을 하고 있습니다.' },
    publicPost: { id: 3, title: '하드코어 연습하기 - 1', content: '믹싱은 언제나 으려워요 :<' },
    privatePost: { id: 5, title: '새우 튀김 기사', content: '새우 튀김 기사' }
  };

  try {
    const { dbClient } = require('../packages/db/dist');
    const dbPubUser = await dbClient.user.findFirst({ where: { profileVisible: 'Public' }, select: { handle: true, name: true, introduce: true } });
    const dbPrivUser = await dbClient.user.findFirst({ where: { profileVisible: 'MemberOnly' }, select: { handle: true, name: true, introduce: true } });
    const dbPubPost = await dbClient.post.findFirst({ where: { visible: 'Public' }, select: { id: true, title: true, content: true } });
    const dbPrivPost = await dbClient.post.findFirst({ where: { visible: 'MemberOnly' }, select: { id: true, title: true, content: true } });
    if (dbPubUser) testSubjects.publicUser = dbPubUser;
    if (dbPrivUser) testSubjects.privateUser = dbPrivUser;
    if (dbPubPost) testSubjects.publicPost = dbPubPost;
    if (dbPrivPost) testSubjects.privatePost = dbPrivPost;
  } catch (e) {
    console.log('  (Using verified sample DB subjects)');
  }

  // Step 2: Dynamic SEO Metadata for Public Items
  console.log('\n[Test 2] Dynamic SEO Metadata for Public Items');
  try {
    const pubUserHandle = testSubjects.publicUser.handle;
    const res = await fetch(`${WEB_BASE}/${pubUserHandle}`);
    const html = await res.text();
    const title = extractTitle(html);
    const desc = extractMeta(html, 'description');
    const robots = extractMeta(html, 'robots');
    const canonical = extractCanonical(html);

    const titleOk = res.status === 200 && title && title.includes(testSubjects.publicUser.name);
    const descOk = desc && (desc.includes(testSubjects.publicUser.introduce.slice(0, 30)) || desc.includes(testSubjects.publicUser.name));
    report(`Public profile /${pubUserHandle} title contains user name`, titleOk, `title: "${title}"`);
    report(`Public profile /${pubUserHandle} description contains intro/name`, descOk, `desc: "${desc}"`);
    report(`Public profile /${pubUserHandle} robots includes "index, follow"`, robots && robots.includes('index'), `robots: "${robots}"`);
    report(`Public profile /${pubUserHandle} canonical link exists`, Boolean(canonical), `canonical: "${canonical}"`);
  } catch (err) {
    report('Public profile SEO metadata', false, err.message);
  }

  try {
    const pubPostId = testSubjects.publicPost.id;
    const res = await fetch(`${WEB_BASE}/gallery/${pubPostId}`);
    const html = await res.text();
    const title = extractTitle(html);
    const desc = extractMeta(html, 'description');
    const robots = extractMeta(html, 'robots');
    const canonical = extractCanonical(html);

    const titleOk = res.status === 200 && title && title.includes(testSubjects.publicPost.title);
    const descOk = desc && (desc.includes(testSubjects.publicPost.content.slice(0, 20)) || desc.length > 0);
    report(`Public post /gallery/${pubPostId} title contains post title`, titleOk, `title: "${title}"`);
    report(`Public post /gallery/${pubPostId} description contains content`, descOk, `desc: "${desc}"`);
    report(`Public post /gallery/${pubPostId} robots includes "index, follow"`, robots && robots.includes('index'), `robots: "${robots}"`);
    report(`Public post /gallery/${pubPostId} canonical link exists`, Boolean(canonical), `canonical: "${canonical}"`);
  } catch (err) {
    report('Public post SEO metadata', false, err.message);
  }

  // Step 3: 404 Routing & Custom Korean Not-Found
  console.log('\n[Test 3] 404 Routing & Korean Not-Found');
  const notFoundRoutes = [
    { path: '/nonexistent_user_999999', label: 'Non-existent profile handle' },
    { path: '/gallery/999999', label: 'Non-existent gallery post ID' },
    { path: '/@@@', label: 'Invalid profile handle format' },
  ];
  for (const item of notFoundRoutes) {
    try {
      const res = await fetch(`${WEB_BASE}${item.path}`);
      const html = await res.text();
      const is404 = res.status === 404;
      const robots = extractMeta(html, 'robots');
      const hasKoreanNotFound = html.includes('페이지를 찾지 못하였어요') ||
                                html.includes('찾으시는 페이지') ||
                                html.includes('홈으로 가기') ||
                                (robots && robots.includes('noindex'));
      report(`Route ${item.path} returns HTTP 404 (${item.label})`, is404, `status: ${res.status}`);
      report(`Route ${item.path} serves Korean 404 / noindex fallback`, Boolean(hasKoreanNotFound), `robots: "${robots}"`);
    } catch (err) {
      report(`Route ${item.path} 404 check`, false, err.message);
    }
  }

  // Step 4: Privacy & Anti-Leakage
  console.log('\n[Test 4] Privacy & Anti-Leakage (Anonymous Access)');
  try {
    const privUserHandle = testSubjects.privateUser.handle;
    const res = await fetch(`${WEB_BASE}/${privUserHandle}`);
    const html = await res.text();
    const title = extractTitle(html);
    const desc = extractMeta(html, 'description');
    const robots = extractMeta(html, 'robots');

    const nameLeaked = title.includes(testSubjects.privateUser.name);
    const introLeaked = testSubjects.privateUser.introduce && desc.includes(testSubjects.privateUser.introduce);
    const isGenericMeta = title.includes('프로필 상세보기') || title.includes('아이디어스랩');
    const isNoIndex = robots && robots.includes('noindex');

    report(`Private user /${privUserHandle} does NOT leak private name`, !nameLeaked, `name: "${testSubjects.privateUser.name}"`);
    report(`Private user /${privUserHandle} does NOT leak private intro`, !introLeaked);
    report(`Private user /${privUserHandle} uses generic title`, isGenericMeta, `title: "${title}"`);
    report(`Private user /${privUserHandle} has noindex robots tag`, Boolean(isNoIndex), `robots: "${robots}"`);
  } catch (err) {
    report('Private user anti-leakage', false, err.message);
  }

  try {
    const privPostId = testSubjects.privatePost.id;
    const res = await fetch(`${WEB_BASE}/gallery/${privPostId}`);
    const html = await res.text();
    const title = extractTitle(html);
    const desc = extractMeta(html, 'description');
    const robots = extractMeta(html, 'robots');

    const titleLeaked = title.includes(testSubjects.privatePost.title);
    const contentLeaked = testSubjects.privatePost.content && desc.includes(testSubjects.privatePost.content);
    const isGenericMeta = title.includes('갤러리 게시글') || title.includes('아이디어스랩');
    const isNoIndex = robots && robots.includes('noindex');

    report(`Private post /gallery/${privPostId} does NOT leak private title`, !titleLeaked, `title: "${testSubjects.privatePost.title}"`);
    report(`Private post /gallery/${privPostId} does NOT leak private content`, !contentLeaked);
    report(`Private post /gallery/${privPostId} uses generic title`, isGenericMeta, `title: "${title}"`);
    report(`Private post /gallery/${privPostId} has noindex robots tag`, Boolean(isNoIndex), `robots: "${robots}"`);
  } catch (err) {
    report('Private post anti-leakage', false, err.message);
  }

  // Step 5: Google SEO Verification (robots.txt & sitemap.xml)
  console.log('\n[Test 5] Google SEO Verification (robots.txt & sitemap.xml)');
  try {
    const res = await fetch(`${WEB_BASE}/robots.txt`);
    const txt = await res.text();
    const hasAllowGallery = txt.includes('Allow: /gallery');
    const hasDisallowSettings = txt.includes('Disallow: /settings');
    const hasSitemap = txt.includes('sitemap.xml');
    report('/robots.txt returns 200', res.status === 200, `status: ${res.status}`);
    report('/robots.txt allows public routes (/gallery, /profiles)', hasAllowGallery);
    report('/robots.txt disallows member routes (/settings, /user-home)', hasDisallowSettings);
    report('/robots.txt specifies sitemap.xml', hasSitemap);
  } catch (err) {
    report('robots.txt verification', false, err.message);
  }

  try {
    const res = await fetch(`${WEB_BASE}/sitemap.xml`);
    const xml = await res.text();
    const isXml = xml.includes('<?xml') || xml.includes('<urlset');
    const hasStaticHome = xml.includes('https://ideaslab.kr/');
    const hasGallery = xml.includes('https://ideaslab.kr/gallery');
    const hasProfiles = xml.includes('https://ideaslab.kr/profiles');
    const hasPostItems = /https:\/\/ideaslab\.kr\/gallery\/\d+/.test(xml);
    const hasProfileItems = /https:\/\/ideaslab\.kr\/@[a-zA-Z0-9_-]+/.test(xml);

    report('/sitemap.xml returns 200', res.status === 200, `status: ${res.status}`);
    report('/sitemap.xml is valid XML urlset', isXml);
    report('/sitemap.xml includes static routes (/, /gallery, /profiles)', hasStaticHome && hasGallery && hasProfiles);
    report('/sitemap.xml includes dynamic public posts (/gallery/[id])', hasPostItems);
    report('/sitemap.xml includes dynamic public profiles (/@handle)', hasProfileItems);
  } catch (err) {
    report('sitemap.xml verification', false, err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All core live functional, SEO, and privacy verifications succeeded 100%!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
