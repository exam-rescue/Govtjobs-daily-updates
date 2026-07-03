// Cloudflare Pages Function - SSR Job Pages
// Handles /job/[id] requests with fully pre-rendered HTML for SEO
// This ensures Google sees complete content instead of empty "Loading..." text

const SITE_URL = 'https://govtjobs-daily-updates.pages.dev';
const SITE_NAME = 'GovtJobs Daily';

// Cache jobs data at the module level (persists across requests in the same isolate)
let jobsCache = null;
let jobsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const TYPE_INFO = {
  recruitment: { label: 'Recruitment', emoji: '\u{1F4BC}', color: '#059669' },
  admit_card: { label: 'Admit Card', emoji: '\u{1F3AB}', color: '#D97706' },
  answer_key: { label: 'Answer Key', emoji: '\u{1F4DD}', color: '#7C3AED' },
  result: { label: 'Result', emoji: '\u{1F4CA}', color: '#DC2626' },
  syllabus: { label: 'Syllabus', emoji: '\u{1F4D6}', color: '#2563EB' },
  update: { label: 'Update', emoji: '\u{1F514}', color: '#6B7280' },
};

const CATEGORY_LABELS = {
  'Central Govt': 'central-govt', 'State Govt': 'state-govt', 'PSU': 'psu-jobs',
  'Banking': 'banking-jobs', 'Railway': 'railway-jobs', 'Defence': 'defence-jobs',
  'Teaching': 'teaching-jobs', 'Engineering': 'railway-jobs', 'Medical': '',
  'Other': '', 'UPSC': '', 'Police': 'police-jobs',
};

async function getJobs(env) {
  const now = Date.now();
  if (jobsCache && now - jobsCacheTime < CACHE_TTL) return jobsCache;

  const resp = await fetch(`${SITE_URL}/data/jobs.json`);
  if (!resp.ok) throw new Error('Failed to fetch jobs');
  jobsCache = await resp.json();
  jobsCacheTime = now;
  return jobsCache;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80);
}

function buildMetaTitle(job) {
  const org = job.organization ? `${job.organization} ` : '';
  const type = TYPE_INFO[job.post_type]?.label || 'Notification';
  return `${job.title} - ${org}${type} 2026 | ${SITE_NAME}`;
}

function buildMetaDesc(job) {
  const parts = [];
  if (job.organization) parts.push(`Apply for ${job.organization}`);
  const fields = job.fields || {};
  if (fields.vacancies) parts.push(`${fields.vacancies} vacancies`);
  if (fields.last_date) parts.push(`Last date: ${fields.last_date}`);
  if (fields.qualification) parts.push(`Qualification: ${fields.qualification}`);
  if (fields.salary) parts.push(`Salary: ${fields.salary}`);
  if (!parts.length) parts.push('Read full details, eligibility, and official application link');
  return parts.join('. ') + ' on GovtJobs Daily.';
}

function buildArticleLd(job, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: job.title,
    description: buildMetaDesc(job),
    url: url,
    datePublished: job.pub_date || job.sort_date,
    dateModified: job.sort_date || job.pub_date,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/logo.jpg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

function buildBreadcrumbLd(job, url) {
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
  ];
  const catPage = CATEGORY_LABELS[job.category];
  if (catPage) {
    items.push({ '@type': 'ListItem', position: 2, name: job.category + ' Jobs', item: `${SITE_URL}/${catPage}.html` });
    items.push({ '@type': 'ListItem', position: 3, name: job.title.substring(0, 60) });
  } else {
    items.push({ '@type': 'ListItem', position: 2, name: job.title.substring(0, 60) });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function buildFAQ(job) {
  const faqs = [];
  if (job.post_type === 'recruitment') {
    faqs.push({
      '@type': 'Question',
      name: `What is the last date to apply for ${job.organization || 'this recruitment'}?`,
      acceptedAnswer: { '@type': 'Answer', text: job.fields?.last_date || 'Check the official notification for the exact last date.' },
    });
    faqs.push({
      '@type': 'Question',
      name: `How many vacancies are there in ${job.title}?`,
      acceptedAnswer: { '@type': 'Answer', text: job.fields?.vacancies || 'Refer to the official notification for complete vacancy details.' },
    });
    faqs.push({
      '@type': 'Question',
      name: `What is the qualification required for ${job.organization || 'this post'}?`,
      acceptedAnswer: { '@type': 'Answer', text: job.fields?.qualification || 'Check the official notification for detailed eligibility criteria.' },
    });
  }
  return faqs;
}

function renderJobContent(job) {
  const ti = TYPE_INFO[job.post_type] || TYPE_INFO.recruitment;
  const fields = job.fields || {};
  let html = `<div class="post-detail">\n`;
  html += `<div class="post-badge" style="background:${ti.color}20;color:${ti.color};border:1px solid ${ti.color}40;display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:16px;">${ti.emoji} ${ti.label} ${job.category ? '[' + escapeHtml(job.category) + ']' : ''}</div>\n`;
  html += `<h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;font-weight:700;">${escapeHtml(job.title)}</h1>\n`;

  if (job.organization) {
    html += `<p style="font-size:16px;color:#64748b;margin-bottom:20px;"><strong>Organization:</strong> ${escapeHtml(job.organization)}</p>\n`;
  }

  html += `<div class="post-fields">\n`;
  const fieldMap = {
    post_name: ['\u{1F4CC} Post', 'post_name'],
    vacancies: ['\u{1F465} Vacancies', 'vacancies'],
    qualification: ['\u{1F393} Qualification', 'qualification'],
    age_limit: ['\u{1F382} Age Limit', 'age_limit'],
    salary: ['\u{1F4B0} Salary', 'salary'],
    application_fee: ['\u{1F4B5} Application Fee', 'application_fee'],
    selection_process: ['\u{1F4CB} Selection Process', 'selection_process'],
    last_date: ['\u{1F4C5} Last Date', 'last_date'],
    exam_name: ['\u{1F4DD} Exam', 'exam_name'],
    exam_date: ['\u{1F4C5} Exam Date', 'exam_date'],
    reporting_time: ['\u23F0 Reporting Time', 'reporting_time'],
    cutoff_marks: ['\u{1F4C8} Cutoff Marks', 'cutoff_marks'],
    qualified_count: ['\u2705 Qualified', 'qualified_count'],
    next_step: ['\u25B6\uFE0F Next Step', 'next_step'],
    description: ['\u{1F4E2} Update', 'description'],
    important_date: ['\u{1F4C5} Date', 'important_date'],
    objection_deadline: ['\u{1F4C5} Objection Deadline', 'objection_deadline'],
  };

  for (const [key, [label, fieldKey]] of Object.entries(fieldMap)) {
    const val = fields[fieldKey] || fields[key];
    if (val && val.length > 1) {
      html += `<div class="field-row"><span class="field-label">${label}:</span> <span class="field-value">${escapeHtml(val)}</span></div>\n`;
    }
  }
  html += `</div>\n`;

  // Important Links section
  const hasLinks = job.official_link || fields.notification_pdf || job.official_website || fields.download_link;
  if (hasLinks) {
    html += `<div class="post-links" style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">\n`;
    html += `<h2 style="font-size:18px;margin:0 0 12px;">\u{1F517} Important Links</h2>\n`;
    if (fields.notification_pdf) {
      html += `<p style="margin:8px 0;"><a href="${escapeHtml(fields.notification_pdf)}" target="_blank" rel="noopener" style="color:#2563eb;">\u{1F4C4} Download Notification PDF</a></p>\n`;
    }
    if (job.official_link) {
      html += `<p style="margin:8px 0;"><a href="${escapeHtml(job.official_link)}" target="_blank" rel="noopener" style="color:#2563eb;">\u{1F4C4} Apply Online</a></p>\n`;
    }
    if (fields.download_link) {
      html += `<p style="margin:8px 0;"><a href="${escapeHtml(fields.download_link)}" target="_blank" rel="noopener" style="color:#2563eb;">\u{1F3AB} Download ${ti.label}</a></p>\n`;
    }
    if (job.official_website && job.official_website !== job.official_link) {
      html += `<p style="margin:8px 0;"><a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" style="color:#2563eb;">\u{1F310} Official Website</a></p>\n`;
    }
    html += `</div>\n`;
  }

  // Disclaimer
  html += `<p style="margin-top:24px;font-size:13px;color:#94a3b8;line-height:1.6;">Disclaimer: All information is sourced from official websites and is provided for informational purposes only. GovtJobs Daily is not affiliated with any government organization. Always verify details from the official notification before applying.</p>\n`;
  html += `</div>\n`;
  return html;
}

function renderRelatedJobs(job, allJobs, count = 6) {
  const sameType = allJobs.filter(j => j.post_type === job.post_type && j.job_id !== job.job_id);
  const sameOrg = allJobs.filter(j => j.organization === job.organization && j.job_id !== job.job_id);
  const candidates = [...sameOrg.slice(0, 3), ...sameType.slice(0, count)].slice(0, count);
  const unique = [];
  const seen = new Set();
  for (const j of candidates) {
    if (!seen.has(j.job_id)) { seen.add(j.job_id); unique.push(j); }
  }
  if (!unique.length) return '';
  let html = `<div class="related-jobs" style="margin-top:40px;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">\n`;
  html += `<h2 style="font-size:20px;margin:0 0 16px;">\u{1F4CB} Related Government Jobs</h2>\n`;
  for (const j of unique) {
    const ti = TYPE_INFO[j.post_type] || TYPE_INFO.recruitment;
    html += `<a href="/job/${j.job_id}" style="display:block;padding:12px;margin:8px 0;background:white;border-radius:8px;border:1px solid #e2e8f0;text-decoration:none;color:inherit;transition:box-shadow 0.2s;">\n`;
    html += `<span style="color:${ti.color};font-weight:600;font-size:12px;">${ti.emoji} ${ti.label}</span>\n`;
    html += `<div style="font-weight:600;margin-top:4px;font-size:15px;">${escapeHtml(j.title.substring(0, 80))}</div>\n`;
    if (j.organization) html += `<div style="color:#64748b;font-size:13px;margin-top:2px;">${escapeHtml(j.organization)}</div>\n`;
    html += `</a>\n`;
  }
  html += `</div>\n`;
  return html;
}

function renderFullHtml(job, url, allJobs) {
  const title = buildMetaTitle(job);
  const desc = buildMetaDesc(job);
  const articleLd = buildArticleLd(job, url);
  const breadcrumbLd = buildBreadcrumbLd(job, url);
  const faqLd = buildFAQ(job);
  const content = renderJobContent(job);
  const related = renderRelatedJobs(job, allJobs);

  const catPage = CATEGORY_LABELS[job.category];
  const navLinks = `
    <a href="/" style="padding:8px 16px;color:#64748b;text-decoration:none;border-radius:8px;font-size:14px;">Home</a>
    ${catPage ? `<a href="/${catPage}.html" style="padding:8px 16px;color:#64748b;text-decoration:none;border-radius:8px;font-size:14px;">${escapeHtml(job.category)}</a>` : ''}
    <span style="padding:8px 16px;color:#334155;font-weight:600;font-size:14px;">${escapeHtml(job.title.substring(0, 40))}</span>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}">
    <meta name="keywords" content="${escapeHtml(job.title)}, ${escapeHtml(job.organization || '')}, sarkari naukri, govt jobs 2026, government jobs, recruitment, apply online">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${url}">
    <link rel="icon" href="/assets/logo.jpg">
    <meta property="og:locale" content="en_IN">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(desc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE_URL}/assets/logo.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(desc)}">
    <script type="application/ld+json">${JSON.stringify(articleLd)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
    ${faqLd.length ? `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'FAQPage','mainEntity':faqLd})}</script>` : ''}
    <link rel="sitemap" type="application/xml" href="${SITE_URL}/sitemap.xml" title="Sitemap">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;line-height:1.6}
        .container{max-width:800px;margin:0 auto;padding:20px}
        .header{background:white;border-bottom:1px solid #e2e8f0;padding:12px 20px;position:sticky;top:0;z-index:50}
        .header-inner{max-width:800px;margin:0 auto;display:flex;align-items:center;gap:12px}
        .logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit}
        .logo-mark{width:32px;height:32px;border-radius:8px}
        .logo-title{font-weight:800;font-size:16px;color:#0f172a}
        .logo-sub{font-size:11px;color:#64748b;display:block}
        .breadcrumb{padding:12px 20px;font-size:13px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
        .breadcrumb a{color:#2563eb;text-decoration:none}
        .breadcrumb a:hover{text-decoration:underline}
        .post-detail{background:white;border-radius:16px;padding:24px;margin:20px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .field-row{padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;gap:8px}
        .field-label{font-weight:600;color:#475569;min-width:140px;flex-shrink:0}
        .field-value{color:#1e293b}
        .post-links a{display:inline-block;padding:8px 16px;margin:4px 0;background:#eff6ff;color:#1d4ed8;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px}
        .post-links a:hover{background:#dbeafe}
        .footer{background:white;border-top:1px solid #e2e8f0;padding:20px;text-align:center;margin-top:40px}
        .footer p{color:#94a3b8;font-size:13px}
        @media(max-width:640px){
            .field-row{flex-direction:column;gap:2px}
            .field-label{min-width:auto}
            .post-detail{padding:16px;margin:12px}
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-inner">
            <a href="/" class="logo">
                <img src="/assets/logo.jpg" alt="GovtJobs Daily" class="logo-mark">
                <div>
                    <span class="logo-title">GovtJobs Daily</span>
                    <span class="logo-sub">Sarkari Naukri Alerts</span>
                </div>
            </a>
        </div>
    </header>
    <nav class="breadcrumb container">${navLinks}</nav>
    <main class="container">
        ${content}
        ${related}
    </main>
    <footer class="footer">
        <p>&copy; 2026 ${SITE_NAME}. All information sourced from official websites. Not affiliated with any government organization.</p>
    </footer>
</body>
</html>`;
}

function renderNotFound() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Post Not Found - ${SITE_NAME}</title><meta name="robots" content="noindex,follow"></head><body style="font-family:sans-serif;text-align:center;padding:60px 20px"><h1>Post Not Found</h1><p>This job listing may have been removed.</p><a href="/" style="color:#2563eb">Go to Homepage</a></body></html>`;
}

export const onRequest = async (context) => {
  const { params, env } = context;
  const jobId = params.id;

  if (!jobId || jobId.length < 5) {
    return new Response(renderNotFound(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    const allJobs = await getJobs(env);
    const job = allJobs.find(j => j.job_id === jobId);

    if (!job) {
      return new Response(renderNotFound(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const url = `${SITE_URL}/job/${jobId}`;
    const html = renderFullHtml(job, url, allJobs);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    return new Response('Internal Server Error', { status: 500 });
  }
};