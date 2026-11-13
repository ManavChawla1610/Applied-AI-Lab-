/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-rendered pages for search engines: /about, /robots.txt, /sitemap.xml.
 * /about is plain HTML (no JavaScript needed), so Google can read every word of it.
 */

import {
  ABOUT_DESCRIPTION,
  ABOUT_TITLE,
  CONTENT_UPDATED,
  GOOGLE_SITE_VERIFICATION,
  SITE_NAME,
  SITE_URL,
} from '../config/site.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function robotsTxt(): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n');
}

export function sitemapXml(): string {
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/about`, priority: '0.8', changefreq: 'monthly' },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${CONTENT_UPDATED}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

// Questions people actually search. Answers are kept short and link to the official source.
const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much can I make on Airbnb in Washington, DC?',
    a: 'It depends on where your home is, its size and how many nights you host. The calculator looks at comparable Airbnb listings near your address, takes their typical nightly price, subtracts Airbnb’s host fee and multiplies by the nights you choose, then shows a realistic range.',
  },
  {
    q: 'Do I need a license to host on Airbnb in DC?',
    a: 'Yes. DC requires a short-term rental license from the Department of Licensing and Consumer Protection (DLCP). As of November 2026 the license costs $99 for two years.',
  },
  {
    q: 'Can I rent out a home in DC that I don’t live in?',
    a: 'Generally no. DC only licenses short-term rentals at the host’s primary residence, meaning the owner receives the Homestead Deduction. Investment and corporate-owned properties are not eligible.',
  },
  {
    q: 'What is DC’s 90-night limit?',
    a: 'If you rent your home while you are away (a “vacation rental”), DC caps it at 90 nights per calendar year. If you are home during the stay, there is no annual cap. Every stay must be 30 nights or fewer. Limited exemptions exist, for example for work outside DC.',
  },
  {
    q: 'What insurance do DC Airbnb hosts need?',
    a: 'DC requires at least $250,000 in liability insurance, which can come from the rental platform or your own insurer. Confirm with DLCP and your insurer that your coverage qualifies.',
  },
  {
    q: 'Who pays DC’s lodging tax on Airbnb stays?',
    a: 'Guests do. DC’s 15.95% tax on short stays is added to the guest’s bill and Airbnb collects and pays it to DC, so it does not come out of your payout. Income tax on your earnings is separate.',
  },
  {
    q: 'How much does Airbnb take from hosts?',
    a: 'Most hosts on Airbnb’s single-fee structure pay a 15.5% service fee, deducted from the payout. The calculator shows both the listing price and what you receive after the fee.',
  },
];

export function renderAboutPage(): string {
  const url = `${SITE_URL}/about`;
  const faqLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        name: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
        dateModified: CONTENT_UPDATED,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#app` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'How it works', item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(ABOUT_TITLE)}</title>
<meta name="description" content="${esc(ABOUT_DESCRIPTION)}" />
<link rel="canonical" href="${esc(url)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="#FF385C" />
${GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(GOOGLE_SITE_VERIFICATION)}" />` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:title" content="${esc(ABOUT_TITLE)}" />
<meta property="og:description" content="${esc(ABOUT_DESCRIPTION)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(SITE_URL)}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${JSON.stringify(faqLd).replace(/</g, '\\u003c')}</script>
<style>
  :root { --ink:#222; --muted:#5e5e5e; --line:#ebebeb; --rose:#FF385C; --rose-dark:#e00b41; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--ink); line-height:1.65; background:#fff; }
  header { border-bottom:1px solid var(--line); }
  .bar { max-width:760px; margin:0 auto; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--ink); font-weight:700; }
  .logo { width:32px; height:32px; border-radius:10px; background:#e11d48; color:#fff; display:grid; place-items:center; font-size:15px; }
  .btn { display:inline-block; background:var(--rose); color:#fff; text-decoration:none; font-weight:600; padding:10px 18px; border-radius:10px; }
  .btn:hover { background:var(--rose-dark); }
  main { max-width:760px; margin:0 auto; padding:28px 20px 64px; }
  nav.crumbs { font-size:13px; color:var(--muted); }
  nav.crumbs a { color:var(--muted); }
  h1 { font-size:34px; line-height:1.2; margin:10px 0 12px; letter-spacing:-0.01em; }
  h2 { font-size:22px; margin:40px 0 8px; }
  h3 { font-size:17px; margin:22px 0 4px; }
  p, li { color:#333; }
  .lede { font-size:18px; color:var(--muted); }
  .cta { margin:22px 0 8px; }
  ol, ul { padding-left:22px; }
  li { margin:4px 0; }
  .note { background:#f7f7f7; border-radius:12px; padding:14px 16px; font-size:14px; color:var(--muted); }
  a { color:var(--rose-dark); }
  details { border-bottom:1px solid var(--line); padding:12px 0; }
  summary { cursor:pointer; font-weight:600; }
  footer { border-top:1px solid var(--line); font-size:13px; color:var(--muted); }
  footer .bar { display:block; }
  .updated { font-size:13px; color:var(--muted); }
</style>
</head>
<body>
<header>
  <div class="bar">
    <a class="brand" href="/"><span class="logo">DC</span> ${esc(SITE_NAME)}</a>
    <a class="btn" href="/">Estimate my home</a>
  </div>
</header>
<main>
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(SITE_NAME)}</a> › How it works</nav>
  <h1>How much could your DC home make on Airbnb?</h1>
  <p class="lede">${esc(SITE_NAME)} is a free calculator for Washington, DC homeowners. Enter your address, choose your space and how many nights you’d host, and see a realistic monthly Airbnb income estimate, what hosting costs, and what DC requires before you list.</p>
  <p class="cta"><a class="btn" href="/">Try the calculator</a></p>
  <p class="updated">Last updated ${CONTENT_UPDATED}</p>

  <h2>What the calculator shows you</h2>
  <ul>
    <li><strong>Earnings:</strong> your estimated monthly payout, a typical range, the nightly listing price and what you keep per night after Airbnb’s fee, on an interactive map of DC.</li>
    <li><strong>Costs &amp; profit:</strong> cleaning, utilities, supplies, repairs, insurance, the license fee and optional property management, so you see take-home income, not just bookings.</li>
    <li><strong>Legal &amp; setup:</strong> a plain-English checklist of DC’s short-term rental rules, with links to the official DC pages.</li>
    <li><strong>Questions assistant:</strong> ask about your estimate or DC’s rules. Rule answers cite the exact passage from official sources, so you can check them.</li>
  </ul>

  <h2>How we estimate your Airbnb income</h2>
  <ol>
    <li><strong>Find comparable listings.</strong> We look for active Airbnb listings of the same type (entire home or private room) and size near your address. The search starts within half a mile and widens step by step, up to 3 miles, until there are enough similar homes to compare.</li>
    <li><strong>Find the typical price.</strong> We take the median nightly price of those listings, so a few very cheap or very expensive homes don’t skew the result.</li>
    <li><strong>Subtract Airbnb’s fee.</strong> Most hosts pay a 15.5% service fee, taken from the payout.</li>
    <li><strong>Multiply by your nights.</strong> You choose how many nights a month you’d host. We also show how many nights similar homes nearby are typically booked, as a reality check.</li>
    <li><strong>Show a range, not just one number.</strong> The low and high ends come from the cheaper and pricier comparable listings (the 25th and 75th percentiles).</li>
  </ol>
  <p class="note">Listing data: AirDNA. Estimates are based on comparable listings, not a guarantee of bookings or income. Your results depend on your home, pricing, reviews and season.</p>

  <h2>What it costs to host</h2>
  <p>Gross bookings aren’t take-home pay. The calculator subtracts the costs most DC hosts face: Airbnb’s fee, cleaning for each stay, a share of utilities, supplies and repairs, insurance, DC’s license fee and, if you use one, a property manager (typically 10–20% of bookings). You can adjust each assumption.</p>

  <h2>DC short-term rental rules in brief</h2>
  <p>DC’s Department of Licensing and Consumer Protection (DLCP) licenses short-term rentals under the Short-Term Rental Regulation Act of 2018. As of November 2026:</p>
  <ul>
    <li><strong>Primary residence only.</strong> You must own the home and live there (you receive the Homestead Deduction). Investment and corporate-owned properties aren’t eligible.</li>
    <li><strong>Two license types.</strong> A <em>short-term rental</em> is when you’re home during the stay; a <em>vacation rental</em> is when you’re away, capped at 90 nights a year. Every stay must be 30 nights or fewer.</li>
    <li><strong>License fee:</strong> $99 for two years.</li>
    <li><strong>Insurance:</strong> at least $250,000 in liability coverage.</li>
    <li><strong>Safety and records:</strong> working smoke and carbon monoxide detectors, a fire extinguisher, a 24-hour contact number, the license posted inside, and booking records kept for two years.</li>
    <li><strong>Guests:</strong> up to 8, or 2 per bedroom, whichever is greater.</li>
    <li><strong>Taxes:</strong> DC’s 15.95% lodging tax is collected from guests by Airbnb. Your income from hosting is taxable separately.</li>
    <li><strong>Penalties:</strong> hosts who break the rules (for example, hosting without a license or going over the 90-night cap) face fines of $500 for a first violation, $2,000 for a second, and $6,000 plus loss of the license for a third.</li>
  </ul>
  <p>Official sources: <a href="https://dlcp.dc.gov/page/operating-short-term-rental-district-columbia" rel="noopener">DLCP: Operating a short-term rental in DC</a>, <a href="https://code.dccouncil.gov/us/dc/council/code/titles/30/chapters/2/index.full.html" rel="noopener">DC Code Title 30, Chapter 2</a>, <a href="https://otr.cfo.dc.gov/page/taxable-and-non-taxable-services" rel="noopener">DC Office of Tax and Revenue</a>. DLCP’s short-term rental hotline: (202) 221-8550.</p>
  <p class="note">This page is general information, not legal or tax advice. Rules change; check DLCP before you list.</p>

  <h2>Frequently asked questions</h2>
  ${FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n  ')}

  <p class="cta"><a class="btn" href="/">See what your home could make</a></p>
</main>
<footer>
  <div class="bar">
    <p>${esc(SITE_NAME)} is an independent tool for Washington, DC homeowners. It is not affiliated with Airbnb or the DC government. Estimates are not guarantees and are not legal, tax or financial advice.</p>
    <p><a href="/">Calculator</a> · <a href="/about">How it works</a></p>
  </div>
</footer>
</body>
</html>`;
}
