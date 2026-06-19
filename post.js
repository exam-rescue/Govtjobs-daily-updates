// ========== POST DETAIL PAGE ==========
const TYPE_CONFIG = {
    recruitment: { label: 'Recruitment', icon: '📋' },
    admit_card:  { label: 'Admit Card', icon: '🎟️' },
    answer_key:  { label: 'Answer Key', icon: '📝' },
    result:      { label: 'Result', icon: '📊' },
    syllabus:    { label: 'Syllabus', icon: '📖' },
    update:      { label: 'Update', icon: '🔔' },
};

const SECTION_ICONS = {
    'Overview': '📌',
    'Important Dates': '📅',
    'Vacancy Details': '📊',
    'Educational Qualification': '🎓',
    'Age Limit': '👤',
    'Application Fee': '💰',
    'Salary / Pay Scale': '💵',
    'Selection Process': '✅',
    'How to Apply': '📝',
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
        const resp = await fetch('data/posts_full.json');
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
            <div style="font-size:48px;margin-bottom:16px">⚠️</div>
            <h2>Failed to Load</h2>
            <p>Unable to load post data. Please try again later.</p>
            <a href="/" class="back-btn" style="margin-top:20px">← Back to Home</a>`;
    }
}

function showNotFound() {
    document.getElementById('postLoading').hidden = true;
    document.getElementById('postNotFound').hidden = false;
}

function renderPost(job) {
    const tc = TYPE_CONFIG[job.type] || TYPE_CONFIG.update;
    const postUrl = window.location.href;

    // Update page title
    document.title = `${job.title} — GovtJobs Daily`;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', job.description || job.title);

    // Breadcrumb
    const typeLabel = tc.label;
    const breadcrumb = `
        <div class="breadcrumb">
            <a href="/">Home</a>
            <span class="sep">›</span>
            <a href="/?filter=${job.type}">${typeLabel}</a>
            <span class="sep">›</span>
            <span>${esc(job.title.length > 50 ? job.title.substring(0, 50) + '...' : job.title)}</span>
        </div>`;

    // Back button
    const backBtn = `<a href="/" class="back-btn">← Back to All Updates</a>`;

    // Post header
    const postedDate = job.posted_date ? formatDate(job.posted_date) : '';
    const header = `
        <div class="post-header">
            <div class="badges">
                <span class="type-badge ${job.type}">${tc.icon} ${typeLabel}</span>
                <span class="cat-badge ${esc(job.category)}">${esc(job.category)}</span>
            </div>
            <h1>${esc(job.title)}</h1>
            <div class="post-meta">
                ${job.organization ? `<span>🏢 ${esc(job.organization)}</span>` : ''}
                ${postedDate ? `<span>📅 Published: ${postedDate}</span>` : ''}
                ${job.vacancies ? `<span>📊 ${job.vacancies} Vacancies</span>` : ''}
            </div>
        </div>`;

    // Content sections
    let sectionsHTML = '';
    if (job.content_sections && job.content_sections.length > 0) {
        for (const section of job.content_sections) {
            const icon = SECTION_ICONS[section.heading] || '📄';
            let bodyHTML = '';

            if (section.type === 'dates' && section.data) {
                bodyHTML = renderTable(section.data);
            } else if (section.type === 'table' && section.data) {
                bodyHTML = renderTable(section.data);
            } else if (section.content) {
                bodyHTML = `<p>${esc(section.content)}</p>`;
            }

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
        if (job.official_link) links.push({ icon: '🌐', text: 'Apply Online', url: job.official_link, cls: 'primary' });
        if (job.notification_pdf) links.push({ icon: '📄', text: 'Download Notification PDF', url: job.notification_pdf, cls: 'secondary' });
        if (job.official_website) links.push({ icon: '🏛️', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'admit_card') {
        if (job.download_link) links.push({ icon: '🎟️', text: 'Download Admit Card', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '🏛️', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'answer_key') {
        if (job.download_link) links.push({ icon: '📝', text: 'Download Answer Key', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '🏛️', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'result') {
        if (job.download_link) links.push({ icon: '📊', text: 'Check Result', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '🏛️', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else if (job.type === 'syllabus') {
        if (job.download_link) links.push({ icon: '📖', text: 'Download Syllabus', url: job.download_link, cls: 'primary' });
        if (job.official_website) links.push({ icon: '🏛️', text: 'Official Website', url: job.official_website, cls: 'success' });
    } else {
        if (job.official_link || job.download_link) {
            const url = job.official_link || job.download_link;
            links.push({ icon: '🔗', text: 'Official Link', url: url, cls: 'primary' });
        }
        if (job.official_website) links.push({ icon: '🏛️', text: 'Official Website', url: job.official_website, cls: 'success' });
    }

    if (links.length > 0) {
        const linksItems = links.map(l =>
            `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="link-btn ${l.cls}">
                <span class="link-icon">${l.icon}</span>
                <span class="link-text">${l.text}</span>
                <span class="link-arrow">→</span>
            </a>`
        ).join('');
        linksHTML = `
            <div class="links-section">
                <h3>🔗 Important Links</h3>
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
            <button class="share-btn copy" onclick="copyLink()">📋 Copy Link</button>
        </div>`;

    // Related posts (same type, same category, excluding current)
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
                <div class="rc-meta">${r.organization ? esc(r.organization) : ''} ${r.posted_date ? '• ' + formatDate(r.posted_date) : ''}</div>
            </a>`;
        }).join('');

        relatedHTML = `
            <div class="related-section">
                <h3>📌 Related Updates</h3>
                <div class="related-grid">${relatedCards}</div>
            </div>`;
    }

    // Assemble
    const html = `${breadcrumb}${backBtn}${header}${sectionsHTML}${linksHTML}${shareHTML}${relatedHTML}`;

    document.getElementById('postLoading').hidden = true;
    document.getElementById('postContent').hidden = false;
    document.getElementById('postContent').innerHTML = html;
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
        btn.textContent = '✓ Copied!';
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