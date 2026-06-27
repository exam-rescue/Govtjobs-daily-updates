const STATE_SLUGS_POST = {"Andhra Pradesh": "andhra-pradesh-govt-jobs", "Arunachal Pradesh": "arunachal-pradesh-govt-jobs", "Assam": "assam-govt-jobs", "Bihar": "bihar-govt-jobs", "Chhattisgarh": "chhattisgarh-govt-jobs", "Goa": "goa-govt-jobs", "Gujarat": "gujarat-govt-jobs", "Haryana": "haryana-govt-jobs", "Himachal Pradesh": "himachal-pradesh-govt-jobs", "Jharkhand": "jharkhand-govt-jobs", "Karnataka": "karnataka-govt-jobs", "Kerala": "kerala-govt-jobs", "Madhya Pradesh": "madhya-pradesh-govt-jobs", "Maharashtra": "maharashtra-govt-jobs", "Manipur": "manipur-govt-jobs", "Meghalaya": "meghalaya-govt-jobs", "Mizoram": "mizoram-govt-jobs", "Nagaland": "nagaland-govt-jobs", "Odisha": "odisha-govt-jobs", "Punjab": "punjab-govt-jobs", "Rajasthan": "rajasthan-govt-jobs", "Sikkim": "sikkim-govt-jobs", "Tamil Nadu": "tamil-nadu-govt-jobs", "Telangana": "telangana-govt-jobs", "Tripura": "tripura-govt-jobs", "Uttar Pradesh": "uttar-pradesh-govt-jobs", "Uttarakhand": "uttarakhand-govt-jobs", "West Bengal": "west-bengal-govt-jobs", "Delhi": "delhi-govt-jobs", "Jammu & Kashmir": "jammu-kashmir-govt-jobs", "Ladakh": "ladakh-govt-jobs", "Chandigarh": "chandigarh-govt-jobs", "Puducherry": "puducherry-govt-jobs", "Andaman & Nicobar": "andaman-nicobar-govt-jobs", "Lakshadweep": "lakshadweep-govt-jobs"};
// ========== POST DETAIL PAGE ==========
const TYPE_CONFIG = {
    recruitment: { label: 'Recruitment', icon: '\ud83d\udccb' },
    admit_card:  { label: 'Admit Card', icon: '\ud83c\udf9f\ufe0f' },
    answer_key:  { label: 'Answer Key', icon: '\ud83d\udcdd' },
    result:      { label: 'Result', icon: '\ud83d\udcca' },
    syllabus:    { label: 'Syllabus', icon: '\ud83d\udcd6' },
    update:      { label: 'Update', icon: '\ud83d\udd14' },
};

const SECTION_ICONS = {
    'Overview': '\ud83d\udccc',
    'Important Dates': '\ud83d\udcc5',
    'Vacancy Details': '\ud83d\udcca',
    'Educational Qualification': '\ud83c\udf93',
    'Age Limit': '\ud83d\udc64',
    'Application Fee': '\ud83d\udcb0',
    'Salary / Pay Scale': '\ud83d\udcb5',
    'Selection Process': '\u2705',
    'How to Apply': '\ud83d\udcdd',
    'Exam Details': '\ud83c\udfdf\ufe0f',
    'Result Details': '\ud83d\udcca',
};

let allJobs = [];

document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobileToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const mainNav = document.getElementById('mainNav');
            if (mainNav) mainNav.classList.toggle('open');
        });
    }
    loadAndRender();
});

async function loadAndRender() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    if (!postId) {
        showNotFound();
        return;
    }

    try {
        const resp = await fetch('data/jobs.json');
        if (!resp.ok) throw new Error('Failed to load');
        allJobs = await resp.json();

        const job = allJobs.find(j => j.id === postId);
        if (!job) {
            showNotFound();
            return;
        }

        renderPost(job);
    } catch (err) {
        console.error(err);
        document.getElementById('postLoading').innerHTML = `
            <div style="font-size:48px;margin-bottom:16px">\u26a0\ufe0f</div>
            <h2>Failed to Load</h2>
            <p>Unable to load post data. Please try again later.</p>
            <a href="/" class="back-btn" style="margin-top:20px">\u2190 Back to Home</a>`;
    }
}

function showNotFound() {
    document.getElementById('postLoading').hidden = true;
    document.getElementById('postNotFound').hidden = false;
}

function buildContentSections(job) {
    const sections = [];

    // Overview
    const overview = [];
    if (job.organization) overview.push(`<strong>${esc(job.organization)}</strong> has announced`);
    if (job.type === 'recruitment') {
        if (job.vacancies) overview.push(`${esc(job.vacancies)} vacancies for the position of ${esc(job.post_name || 'various posts')}`);
        if (job.description) overview.push(esc(job.description));
    } else if (job.type === 'result') {
        if (job.qualified_count) overview.push(`${esc(job.qualified_count)} candidates have qualified`);
        if (job.next_step) overview.push(`Next step: ${esc(job.next_step)}`);
        if (job.description) overview.push(esc(job.description));
    } else if (job.type === 'admit_card') {
        overview.push('Admit card / Hall Ticket has been released');
        if (job.exam_name) overview.push(`for ${esc(job.exam_name)}`);
        if (job.description) overview.push(esc(job.description));
    } else if (job.type === 'answer_key') {
        overview.push('Answer Key / Response Sheet has been released');
        if (job.exam_name) overview.push(`for ${esc(job.exam_name)}`);
        if (job.description) overview.push(esc(job.description));
    } else if (job.type === 'syllabus') {
        overview.push('Syllabus / Exam Pattern has been published');
        if (job.exam_name) overview.push(`for ${esc(job.exam_name)}`);
        if (job.description) overview.push(esc(job.description));
    } else {
        if (job.description) overview.push(esc(job.description));
    }
    if (overview.length > 0) {
        const text = overview.join(' ');
        if (text.trim()) sections.push({ heading: 'Overview', type: 'content', content: text });
    }

    // Important Dates
    const dates = {};
    if (job.type === 'recruitment') {
        if (job.posted_date) dates['Notification Date'] = formatDate(job.posted_date);
        if (job.last_date) dates['Last Date to Apply'] = job.last_date;
        if (job.exam_date) dates['Exam Date'] = job.exam_date;
    } else if (job.type === 'admit_card') {
        if (job.exam_date) dates['Exam Date'] = job.exam_date;
        if (job.reporting_time) dates['Reporting Time'] = job.reporting_time;
    } else if (job.type === 'answer_key') {
        if (job.exam_date) dates['Exam Date'] = job.exam_date;
        if (job.objection_deadline) dates['Objection Deadline'] = job.objection_deadline;
    } else if (job.type === 'result') {
        if (job.exam_date) dates['Exam Date'] = job.exam_date;
        if (job.posted_date) dates['Result Date'] = formatDate(job.posted_date);
    }
    if (Object.keys(dates).length > 0) {
        sections.push({ heading: 'Important Dates', type: 'dates', data: dates });
    }

    // Vacancy Details (recruitment only)
    if (job.type === 'recruitment') {
        const vacParts = [];
        if (job.post_name) vacParts.push(`<strong>Post Name:</strong> ${esc(job.post_name)}`);
        if (job.vacancies) vacParts.push(`<strong>Total Vacancies:</strong> ${esc(job.vacancies)}`);
        if (vacParts.length > 0) {
            sections.push({ heading: 'Vacancy Details', type: 'content', content: vacParts.join('<br>') });
        }
    }

    // Exam Details (for admit_card, answer_key, result, syllabus)
    if (['admit_card', 'answer_key', 'result', 'syllabus'].includes(job.type)) {
        const examParts = [];
        if (job.exam_name) examParts.push(`<strong>Exam:</strong> ${esc(job.exam_name)}`);
        if (job.organization) examParts.push(`<strong>Organization:</strong> ${esc(job.organization)}`);
        if (examParts.length > 0) {
            sections.push({ heading: 'Exam Details', type: 'content', content: examParts.join('<br>') });
        }
    }

    // Result Details
    if (job.type === 'result') {
        const resultParts = [];
        if (job.qualified_count) resultParts.push(`<strong>Qualified Candidates:</strong> ${esc(job.qualified_count)}`);
        if (job.cutoff_marks) resultParts.push(`<strong>Cutoff Marks:</strong> ${esc(job.cutoff_marks)}`);
        if (job.next_step) resultParts.push(`<strong>Next Step:</strong> ${esc(job.next_step)}`);
        if (resultParts.length > 0) {
            sections.push({ heading: 'Result Details', type: 'content', content: resultParts.join('<br>') });
        }
    }

    // Qualification
    if (job.qualification && job.qualification.trim()) {
        sections.push({ heading: 'Educational Qualification', type: 'content', content: esc(job.qualification) });
    }

    // Age Limit
    if (job.age_limit && job.age_limit.trim()) {
        sections.push({ heading: 'Age Limit', type: 'content', content: esc(job.age_limit) });
    }

    // Application Fee
    if (job.application_fee && job.application_fee.trim()) {
        sections.push({ heading: 'Application Fee', type: 'content', content: esc(job.application_fee) });
    }

    // Salary
    if (job.salary && job.salary.trim()) {
        sections.push({ heading: 'Salary / Pay Scale', type: 'content', content: esc(job.salary) });
    }

    // Selection Process
    if (job.selection_process && job.selection_process.trim()) {
        sections.push({ heading: 'Selection Process', type: 'content', content: esc(job.selection_process) });
    }

    return sections;
}

function buildRelatedLinks(job) {
    var links = [];
    if (job.state && STATE_SLUGS_POST[job.state]) {
        links.push('<a href="' + STATE_SLUGS_POST[job.state] + '.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; ' + esc(job.state) + ' Govt Jobs</a>');
    }
    if (job.qualification) {
        var q = job.qualification.toLowerCase();
        if (/10th|sslc|matric|high school/i.test(q)) {
            links.push('<a href="10th-pass-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; 10th Pass Jobs</a>');
        }
        if (/12th|intermediate|hsc|10\+2|higher secondary/i.test(q)) {
            links.push('<a href="12th-pass-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; 12th Pass Jobs</a>');
        }
        if (/b\.?e\.|b\.?tech|engineering/i.test(q)) {
            links.push('<a href="psu-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; Engineering / PSU Jobs</a>');
        }
        if (/b\.?ed|d\.?el\.?ed|tet|teaching/i.test(q)) {
            links.push('<a href="teaching-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; Teaching Jobs</a>');
        }
        if (/graduate|bachelor/i.test(q)) {
            links.push('<a href="central-govt.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; Central Govt Jobs</a>');
        }
    }
    if (job.category === 'Railway') {
        links.push('<a href="railway-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; Railway Jobs</a>');
    }
    if (job.category === 'Banking') {
        links.push('<a href="banking-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; Banking Jobs</a>');
    }
    if (job.category === 'Defence') {
        links.push('<a href="defence-jobs.html" style="color:#2563eb;text-decoration:none;font-weight:500;display:inline-block;margin:4px 8px 4px 0;">&#x2192; Defence Jobs</a>');
    }
    return links;
}

function renderPost(job) {
    const tc = TYPE_CONFIG[job.type] || TYPE_CONFIG.update;
    const postUrl = window.location.href;

    // Update page title
    document.title = `${job.title} \u2014 GovtJobs Daily`;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', (job.description || job.title).substring(0, 300));

    // SEO: Update OG tags, canonical, Twitter cards
    const ogTitle = document.getElementById('ogTitle');
    const ogDesc = document.getElementById('ogDesc');
    const ogUrl = document.getElementById('ogUrl');
    const canonicalLink = document.getElementById('canonicalLink');
    const twTitle = document.getElementById('twTitle');
    const twDesc = document.getElementById('twDesc');
    if (ogTitle) ogTitle.setAttribute('content', job.title);
    if (ogDesc) ogDesc.setAttribute('content', (job.description || '').substring(0, 200));
    if (ogUrl) ogUrl.setAttribute('content', postUrl);
    if (canonicalLink) canonicalLink.setAttribute('href', postUrl);
    if (twTitle) twTitle.setAttribute('content', job.title);
    if (twDesc) twDesc.setAttribute('content', (job.description || '').substring(0, 200));

    // SEO: Update JSON-LD Article schema in head
    const jsonLdEl = document.getElementById('jsonLdArticle');
    if (jsonLdEl) {
        const schemaData = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": job.title,
            "description": (job.description || '').substring(0, 300),
            "datePublished": job.sort_date || job.posted_date || '',
            "dateModified": job.sort_date || job.posted_date || '',
            "publisher": {
                "@type": "Organization",
                "name": "GovtJobs Daily",
                "url": "https://govtjobs-daily-updates.pages.dev/"
            },
            "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl }
        };
        if (job.organization) schemaData.author = {"@type": "Organization", "name": job.organization};
        jsonLdEl.textContent = JSON.stringify(schemaData);
    }

    // Breadcrumb
    const typeLabel = tc.label;
    const breadcrumb = `
        <div class="breadcrumb">
            <a href="/">Home</a>
            <span class="sep">\u203a</span>
            <a href="/?filter=${job.type}">${typeLabel}</a>
            <span class="sep">\u203a</span>
            <span>${esc(job.title.length > 50 ? job.title.substring(0, 50) + '...' : job.title)}</span>
        </div>`;

    // Back button
    const backBtn = `<a href="/" class="back-btn">\u2190 Back to All Updates</a>`;

    // Post header
    const postedDate = job.posted_date ? formatDate(job.posted_date) : '';
    const header = `
        <div class="post-header">
            <div class="badges">
                <span class="type-badge ${job.type}">${tc.icon} ${typeLabel}</span>
                <span class="cat-badge ${esc(job.category)}">${esc(job.category)}</span>
                ${job.state ? `<span class="cat-badge state-badge">${esc(job.state)}</span>` : ''}
            </div>
            <h1>${esc(job.title)}</h1>
            <div class="post-meta">
                ${job.organization ? `<span>\ud83c\udfe2 ${esc(job.organization)}</span>` : ''}
                ${postedDate ? `<span>\ud83d\udcc5 Published: ${postedDate}</span>` : ''}
                ${job.vacancies ? `<span>\ud83d\udcca ${job.vacancies} Vacancies</span>` : ''}
            </div>
        </div>`;

    // Content sections - build from flat fields
    const contentSections = buildContentSections(job);
    let sectionsHTML = '';
    for (const section of contentSections) {
        const icon = SECTION_ICONS[section.heading] || '\ud83d\udcc4';
        let bodyHTML = '';

        if (section.type === 'dates' && section.data) {
            bodyHTML = renderTable(section.data);
        } else if (section.type === 'table' && section.data) {
            bodyHTML = renderTable(section.data);
        } else if (section.content) {
            bodyHTML = `<p>${section.content}</p>`;
        }

        if (bodyHTML) {
            sectionsHTML += `
                <div class="content-section">
                    <div class="section-heading">
                        <span class="sh-icon">${icon}</span>
                        ${esc(section.heading)}
                    </div>
                    <div class="section-body">
                        ${bodyHTML}
                    </div>
                </div>`;
        }
    }

    // Important Links
    let linksHTML = '';
    const links = [];
    if (job.type === 'recruitment') {
        if (job.official_link) links.push({ icon: '\ud83c\udf10', text: 'Apply Online', url: job.official_link, cls: 'primary' });
        if (job.notification_pdf) links.push({ icon: '\ud83d\udcc4', text: 'Download Notification PDF', url: job.notification_pdf, cls: 'secondary' });
        if (job.official_website) links.push({ icon: '\ud83c\udfdb\ufe0f', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'admit_card') {
        if (job.download_link) links.push({ icon: '\ud83c\udf9f\ufe0f', text: 'Download Admit Card', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '\ud83c\udfdb\ufe0f', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'answer_key') {
        if (job.download_link) links.push({ icon: '\ud83d\udcdd', text: 'Download Answer Key', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '\ud83c\udfdb\ufe0f', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'result') {
        if (job.download_link) links.push({ icon: '\ud83d\udcca', text: 'Check Result', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '\ud83c\udfdb\ufe0f', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'syllabus') {
        if (job.download_link) links.push({ icon: '\ud83d\udcd6', text: 'Download Syllabus', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '\ud83c\udfdb\ufe0f', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else {
        if (job.official_link || job.download_link) {
            const url = job.official_link || job.download_link;
            links.push({ icon: '\ud83d\udd17', text: 'Official Link', url: url, cls: 'primary' });
        }
        if (job.official_website) links.push({ icon: '\ud83c\udfdb\ufe0f', text: 'Official Website', url: job.official_website, cls: 'success' });
    }

    if (links.length > 0) {
        const linksItems = links.map(l =>
            `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="link-btn ${l.cls}">
                <span class="link-icon">${l.icon}</span>
                <span class="link-text">${l.text}</span>
                <span class="link-arrow">\u2192</span>
            </a>`
        ).join('');
        linksHTML = `
            <div class="links-section">
                <h3>\ud83d\udd17 Important Links</h3>
                <div class="links-grid">${linksItems}</div>
            </div>`;
    }

    // Share bar
    const encodedTitle = encodeURIComponent(job.title);
    const encodedUrl = encodeURIComponent(postUrl);
    const shareHTML = `
        <div class="share-bar">
            <span>Share:</span>
            <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn telegram">Telegram</a>
            <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" class="share-btn whatsapp">WhatsApp</a>
            <button class="share-btn copy" onclick="copyLink()">\ud83d\udccb Copy Link</button>
        </div>`;

    // Related posts (same type or category, excluding current)
    let relatedHTML = '';
    const related = allJobs.filter(j => j.id !== job.id && (j.type === job.type || j.category === job.category)).slice(0, 6);
    if (related.length > 0) {
        const relatedCards = related.map(r => {
            const rtc = TYPE_CONFIG[r.type] || TYPE_CONFIG.update;
            return `<a href="post.html?id=${r.id}" class="related-card">
                <div class="rc-badges">
                    <span class="type-badge ${r.type}" style="font-size:9px;padding:2px 7px">${rtc.icon} ${rtc.label}</span>
                    <span class="cat-badge ${esc(r.category)}" style="font-size:9px;padding:2px 7px">${esc(r.category)}</span>
                </div>
                <div class="rc-title">${esc(r.title)}</div>
                <div class="rc-meta">${r.organization ? esc(r.organization) : ''} ${r.posted_date ? '\u2022 ' + formatDate(r.posted_date) : ''}</div>
            </a>`;
        }).join('');

        relatedHTML = `
            <div class="related-section">
                <h3>\ud83d\udccc Related Updates</h3>
                <div class="related-grid">${relatedCards}</div>
            </div>`;
    }

    // Assemble
    const html = `${breadcrumb}${backBtn}${header}${sectionsHTML}${linksHTML}${shareHTML}${relatedHTML}`;

    document.getElementById('postLoading').hidden = true;
    document.getElementById('postContent').hidden = false;
    document.getElementById('postContent').innerHTML = html;

    // JSON-LD structured data
    try {
        var jsonLd = {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": job.title,
            "description": job.description || job.title,
            "datePosted": job.posted_date || new Date().toISOString().split("T")[0],
            "url": postUrl,
            "hiringOrganization": {
                "@type": "Organization",
                "name": job.organization || "Government of India"
            }
        };
        if (job.qualification) jsonLd.qualificationRequirements = job.qualification;
        if (job.official_website) jsonLd.hiringOrganization.sameAs = job.official_website;
        if (job.type === 'recruitment' && job.last_date) jsonLd.validThrough = job.last_date;
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(jsonLd);
        document.head.appendChild(s);
    } catch(e) {}

    const telegramCta = document.getElementById('telegramCta');
    if (telegramCta) telegramCta.hidden = false;
}

function renderTable(data) {
    let rows = '';
    for (const [key, val] of Object.entries(data)) {
        rows += `<tr><td>${esc(key)}</td><td>${esc(val)}</td></tr>`;
    }
    return `<table class="dates-table">${rows}</table>`;
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = event.target;
        const orig = btn.textContent;
        btn.textContent = '\u2713 Copied!';
        setTimeout(() => btn.textContent = orig, 2000);
    });
}

function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch(e) { return dateStr; }
}