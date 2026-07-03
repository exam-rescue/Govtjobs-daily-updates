// Cloudflare Pages Function - SSR Job Pages v2
// Handles /job/[id] requests with fully pre-rendered HTML for SEO

const SITE_NAME = 'GovtJobs Daily';

const TYPE_INFO = {
  recruitment: { label: 'Recruitment', emoji: '\u{1F4BC}', color: '#059669' },
  admit_card: { label: 'Admit Card', emoji: '\u{1F3AB}', color: '#D97706' },
  answer_key: { label: 'Answer Key', emoji: '\u{1F4DD}', color: '#7C3AED' },
  result: { label: 'Result', emoji: '\u{1F4CA}', color: '#DC2626' },
  syllabus: { label: 'Syllabus', emoji: '\u{1F4D6}', color: '#2563EB' },
  update: { label: 'Update', emoji: '\u{1F514}', color: '#6B7280' },
};

const CATEGORY_LINKS = {
  'Central Govt': 'central-govt', 'PSU': 'psu-jobs', 'Banking': 'banking-jobs',
  'Railway': 'railway-jobs', 'Defence': 'defence-jobs', 'Teaching': 'teaching-jobs',
  'Engineering': 'railway-jobs', 'Police': 'police-jobs', 'State Govt': 'state-govt',
  'Medical': '', 'Other': '', 'UPSC': '',
};

// In-memory cache (persists within the same isolate)
let cachedJobs = null;
let cacheTime = 0;

async function loadJobs(host) {
  const now = Date.now();
  if (cachedJobs && now - cacheTime < 300000) return cachedJobs; // 5 min cache
  try {
    const url = `https://${host}/data/jobs.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    cachedJobs = await resp.json();
    cacheTime = now;
    return cachedJobs;
  } catch (e) {
    // Fallback: try fetching from GitHub raw
    try {
      const resp = await fetch('https://raw.githubusercontent.com/exam-rescue/Govtjobs-daily-updates/main/data/jobs.json');
      if (!resp.ok) throw new Error(`GitHub HTTP ${resp.status}`);
      cachedJobs = await resp.json();
      cacheTime = now;
      return cachedJobs;
    } catch (e2) {
      return null;
    }
  }
}

function esc(s) {
  return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
}

function metaTitle(j) {
  const org = j.organization ? `${j.organization} ` : '';
  const type = TYPE_INFO[j.post_type]?.label || 'Notification';
  return `${j.title} - ${org}${type} 2026 | ${SITE_NAME}`;
}

function metaDesc(j) {
  const p = [];
  if (j.organization) p.push(`Apply for ${j.organization}`);
  const f = j.fields || {};
  if (f.vacancies) p.push(`${f.vacancies} vacancies`);
  if (f.last_date) p.push(`Last date: ${f.last_date}`);
  if (f.qualification) p.push(`${f.qualification}`);
  if (f.salary) p.push(`Salary: ${f.salary}`);
  if (!p.length) p.push('Read full details, eligibility, and official application link');
  return p.join('. ') + ' on GovtJobs Daily.';
}

function renderHtml(j, url, allJobs, siteUrl) {
  const ti = TYPE_INFO[j.post_type] || TYPE_INFO.recruitment;
  const f = j.fields || {};
  const catLink = CATEGORY_LINKS[j.category];

  // Build field rows
  let fields = '';
  const fm = [
    ['\u{1F4CC} Post', f.post_name], ['\u{1F465} Vacancies', f.vacancies],
    ['\u{1F393} Qualification', f.qualification], ['\u{1F382} Age Limit', f.age_limit],
    ['\u{1F4B0} Salary', f.salary], ['\u{1F4B5} Fee', f.application_fee],
    ['\u{1F4CB} Selection', f.selection_process], ['\u{1F4C5} Last Date', f.last_date],
    ['\u{1F4DD} Exam', f.exam_name], ['\u{1F4C5} Exam Date', f.exam_date],
    ['\u{1F4C8} Cutoff', f.cutoff_marks], ['\u2705 Qualified', f.qualified_count],
    ['\u25B6\uFE0F Next Step', f.next_step], ['\u{1F4E2} Update', f.description],
  ];
  for (const [label, val] of fm) {
    if (val && val.length > 1) {
      fields += `<div class="fr"><span class="fl">${label}:</span><span class="fv">${esc(val)}</span></div>\n`;
    }
  }

  // Build links section
  let links = '';
  if (j.official_link || f.notification_pdf || j.official_website || f.download_link) {
    links = `<div class="links-box"><h2>\u{1F517} Important Links</h2>`;
    if (f.notification_pdf) links += `<a href="${esc(f.notification_pdf)}" rel="noopener">\u{1F4C4} Download Notification PDF</a>`;
    if (j.official_link) links += `<a href="${esc(j.official_link)}" rel="noopener">\u{1F4C4} Apply Online</a>`;
    if (f.download_link) links += `<a href="${esc(f.download_link)}" rel="noopener">\u{1F3AB} Download ${ti.label}</a>`;
    if (j.official_website && j.official_website !== j.official_link) links += `<a href="${esc(j.official_website)}" rel="noopener">\u{1F310} Official Website</a>`;
    links += `</div>`;
  }

  // Related jobs
  let related = '';
  const sameOrg = allJobs.filter(x => x.organization === j.organization && x.job_id !== j.job_id).slice(0, 3);
  const sameType = allJobs.filter(x => x.post_type === j.post_type && x.job_id !== j.job_id && !sameOrg.find(s => s.job_id === x.job_id)).slice(0, 3);
  const rj = [...sameOrg, ...sameType].slice(0, 6);
  if (rj.length) {
    related = `<div class="related"><h2>\u{1F4CB} Related Government Jobs</h2>`;
    for (const r of rj) {
      const rt = TYPE_INFO[r.post_type] || TYPE_INFO.recruitment;
      related += `<a href="/job/${r.job_id}"><span class="rbadge" style="color:${rt.color}">${rt.emoji} ${rt.label}</span><strong>${esc(r.title.substring(0, 80))}</strong>${r.organization ? `<span>${esc(r.organization)}</span>` : ''}</a>`;
    }
    related += `</div>`;
  }

  // JSON-LD
  const articleLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: j.title, description: metaDesc(j), url,
    datePublished: j.pub_date || j.sort_date, dateModified: j.sort_date || j.pub_date,
    author: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: siteUrl, logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.jpg` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  });
  const bcLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: catLink
      ? [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }, { '@type': 'ListItem', position: 2, name: j.category, item: `${siteUrl}/${catLink}.html` }, { '@type': 'ListItem', position: 3, name: j.title.substring(0, 60) }]
      : [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }, { '@type': 'ListItem', position: 2, name: j.title.substring(0, 60) }],
  });

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(metaTitle(j))}</title>
<meta name="description" content="${esc(metaDesc(j))}">
<meta name="keywords" content="${esc(j.title)}, ${esc(j.organization||'')}, sarkari naukri, govt jobs 2026, government jobs, recruitment, apply online">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<link rel="canonical" href="${url}"><link rel="icon" href="/assets/logo.jpg">
<meta property="og:locale" content="en_IN"><meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}"><meta property="og:title" content="${esc(metaTitle(j))}">
<meta property="og:description" content="${esc(metaDesc(j))}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${siteUrl}/assets/logo.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(metaTitle(j))}">
<meta name="twitter:description" content="${esc(metaDesc(j))}">
<script type="application/ld+json">${articleLd}</script>
<script type="application/ld+json">${bcLd}</script>
<link rel="sitemap" type="application/xml" href="${siteUrl}/sitemap.xml">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;line-height:1.6}
.hdr{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 20px;position:sticky;top:0;z-index:50}
.hdr-in{max-width:800px;margin:0 auto;display:flex;align-items:center;gap:10px}
.hdr a{text-decoration:none;color:inherit;display:flex;align-items:center;gap:8px}
.hdr img{width:32px;height:32px;border-radius:8px}
.hdr-t{font-weight:800;font-size:16px}.hdr-s{font-size:11px;color:#64748b;display:block}
.bc{max-width:800px;margin:0 auto;padding:10px 20px;font-size:13px;display:flex;flex-wrap:wrap;gap:4px}
.bc a{color:#2563eb;text-decoration:none}.bc a:hover{text-decoration:underline}
.card{max-width:800px;margin:16px auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:16px}
.fr{padding:10px 0;border-bottom:1px solid #f1f5f9}.fl{font-weight:600;color:#475569;display:block;min-width:140px}.fv{color:#1e293b}
.lb{margin-top:24px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
.lb h2{font-size:18px;margin:0 0 12px}.lb a{display:block;padding:8px 0}.lb a span{display:block}
.r{max-width:800px;margin:24px auto;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
.r h2{font-size:20px;margin:0 0 16px}.r a{display:block;padding:12px;margin:6px 0;background:#fff;border-radius:8px;border:1px solid #e2e8f0;text-decoration:none;color:inherit}
.rbadge{font-size:12px;font-weight:600}.r a strong{display:block;margin-top:4px;font-size:15px}
.r a>span{color:#64748b;font-size:13px;margin-top:2px;display:block}
.ft{background:#fff;border-top:1px solid #e2e8f0;padding:20px;text-align:center;margin-top:40px}
.ft p{color:#94a3b8;font-size:13px}
@media(max-width:640px){.fl{min-width:auto}.card{padding:16px;margin:12px}}</style>
</head><body>
<header class="hdr"><div class="hdr-in"><a href="/"><img src="/assets/logo.jpg" alt="${SITE_NAME}"><div><span class="hdr-t">${SITE_NAME}</span><span class="hdr-s">Sarkari Naukri Alerts</span></div></a></div></header>
<nav class="bc"><a href="/">Home</a>${catLink ? `<span>\u203A</span><a href="/${catLink}.html">${esc(j.category)}</a>` : ''}<span>\u203A</span><span>${esc(j.title.substring(0,50))}</span></nav>
<article class="card">
<div class="badge" style="background:${ti.color}18;color:${ti.color};border:1px solid ${ti.color}35">${ti.emoji} ${ti.label}${j.category ? ' [' + esc(j.category) + ']' : ''}</div>
<h1 style="font-size:22px;line-height:1.35;margin:0 0 12px;font-weight:700">${esc(j.title)}</h1>
${j.organization ? `<p style="font-size:15px;color:#64748b;margin-bottom:16px"><strong>Organization:</strong> ${esc(j.organization)}</p>` : ''}
${fields}${links}
<p style="margin-top:20px;font-size:12px;color:#94a3b8">Disclaimer: All information sourced from official websites. ${SITE_NAME} is not affiliated with any government organization.</p>
</article>${related}
<footer class="ft"><p>\u00A9 2026 ${SITE_NAME}. All information sourced from official websites.</p></footer>
</body></html>`;
}

export const onRequest = async (context) => {
  const { params, request } = context;
  const jobId = params.id;
  const host = request.headers.get('host') || 'govtjobs-daily-updates.pages.dev';
  const siteUrl = `https://${host}`;

  if (!jobId || jobId.length < 5) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  const allJobs = await loadJobs(host);
  if (!allJobs) {
    return new Response('Service temporarily unavailable', { status: 503, headers: { 'Content-Type': 'text/html' } });
  }

  const job = allJobs.find(j => j.job_id === jobId);
  if (!job) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  const url = `${siteUrl}/job/${jobId}`;
  const html = renderHtml(job, url, allJobs, siteUrl);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};