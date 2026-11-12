const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://hasnaindigital-portfolio.vercel.app';
const pages = [
  '/',
  '/seo-services/',
  '/web-development/',
  '/digital-marketing/',
  '/python-development/',
  '/ui-ux-design/'
];
const titles = new Set();
const descriptions = new Set();

function pageFile(urlPath) {
  return path.join(root, urlPath === '/' ? 'index.html' : `${urlPath.slice(1)}index.html`);
}

function allSchemaNodes(value) {
  if (!value || typeof value !== 'object') return [];
  const ownTypes = Array.isArray(value['@type']) ? value['@type'] : [value['@type']].filter(Boolean);
  return [
    ...ownTypes,
    ...(Array.isArray(value['@graph']) ? value['@graph'].flatMap(allSchemaNodes) : []),
    ...(Array.isArray(value) ? value.flatMap(allSchemaNodes) : [])
  ];
}

for (const urlPath of pages) {
  const html = fs.readFileSync(pageFile(urlPath), 'utf8');
  const expectedUrl = new URL(urlPath, origin).href;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"\s*\/?\s*>/i)?.[1];
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?\s*>/i)?.[1];
  assert.ok(title, `${urlPath} needs a title`);
  assert.ok(description, `${urlPath} needs a meta description`);
  assert.equal(canonical, expectedUrl, `${urlPath} canonical should match its production URL`);
  assert.ok(!titles.has(title), `Duplicate title: ${title}`);
  assert.ok(!descriptions.has(description), `Duplicate description: ${description}`);
  titles.add(title);
  descriptions.add(description);
  assert.match(html, /<meta\s+property="og:title"/i, `${urlPath} needs Open Graph title`);
  assert.match(html, /<meta\s+property="og:description"/i, `${urlPath} needs Open Graph description`);
  assert.match(html, new RegExp(`<meta\\s+property="og:url"\\s+content="${expectedUrl.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"`, 'i'), `${urlPath} Open Graph URL should be canonical`);
  assert.match(html, new RegExp(`<meta\\s+property="og:image"\\s+content="${origin.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/images/hasnain-photo-from-reference\\.png"`, 'i'), `${urlPath} Open Graph image should be absolute`);
  assert.match(html, /<meta\s+name="twitter:card"\s+content="summary_large_image"/i, `${urlPath} needs a Twitter card`);
  assert.match(html, /<meta\s+name="twitter:image:alt"/i, `${urlPath} needs an image alternative`);

  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  assert.equal(h1Count, 1, `${urlPath} should have one primary heading`);
  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  for (let index = 1; index < headingLevels.length; index += 1) {
    assert.ok(headingLevels[index] <= headingLevels[index - 1] + 1, `${urlPath} skips a heading level`);
  }
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    assert.match(image[0], /\balt\s*=/i, `${urlPath} has an image without alt text`);
  }

  const schemaScripts = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  assert.ok(schemaScripts.length, `${urlPath} needs JSON-LD structured data`);
  const types = schemaScripts.flatMap((match) => allSchemaNodes(JSON.parse(match[1])));
  if (urlPath === '/') {
    for (const requiredType of ['WebSite', 'Person', 'ProfilePage']) {
      assert.ok(types.includes(requiredType), `Homepage schema needs ${requiredType}`);
    }
  } else {
    assert.ok(types.includes('Service'), `${urlPath} needs a Service schema node`);
  }
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual([...sitemapUrls].sort(), pages.map((page) => new URL(page, origin).href).sort(), 'Sitemap should contain only canonical public pages');
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'Sitemap URLs should be unique');

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt should point to the production sitemap');
assert.ok(robots.includes('Disallow: /api/'), 'robots.txt should exclude API endpoints');

const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
assert.match(admin, /<meta\s+name="robots"\s+content="noindex, nofollow"/i, 'Admin page should not be indexable');
const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
assert.match(notFound, /<meta\s+name="robots"\s+content="noindex, nofollow"/i, '404 page should not be indexable');

process.stdout.write(`SEO checks passed for ${pages.length} public pages, sitemap, robots.txt, and structured data.\n`);
