// ========== STATE ==========
let allJobs = [];
let filteredJobs = [];
let currentPage = 0;
const PAGE_SIZE = 18;
let activeType = 'all';
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'newest';
let viewMode = 'grid';

// ========== TYPE CONFIG ==========
const TYPE_CONFIG = {
    recruitment: { label: 'Recruitment', icon: '📋', emoji: '📋' },
    admit_card:  { label: 'Admit Card', icon: '🎟️', emoji: '🎟️' },
    answer_key:  { label: 'Answer Key', icon: '📝', emoji: '📝' },
    result:      { label: 'Result', icon: '📊', emoji: '📊' },
    syllabus:    { label: 'Syllabus', icon: '📖', emoji: '📖' },
    update:      { label: 'Update', icon: '🔔', emoji: '🔔' },
};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEventListeners();
});

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    let searchTimer;
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = e.target.value.trim().toLowerCase();
            searchClear.hidden = !searchQuery;
            currentPage = 0;
            applyFilters();
        }, 250);
    });
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.hidden = true;
        currentPage = 0;
        applyFilters();
        searchInput.focus();
    });

    // Type nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            activeType = link.dataset.filter;
            currentPage = 0;
            applyFilters();
        });
    });

    // Category chips
    document.querySelectorAll('#categoryFilters .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#categoryFilters .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategory = chip.dataset.value;
            currentPage = 0;
            applyFilters();
        });
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', e => {
        sortMode = e.target.value;
        currentPage = 0;
        applyFilters();
    });

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            viewMode = btn.dataset.view;
            const grid = document.getElementById('jobGrid');
            grid.classList.toggle('list-view', viewMode === 'list');
        });
    });

    // Load more
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        renderJobs(false);
    });

    // Mobile nav toggle
    document.getElementById('mobileToggle').addEventListener('click', () => {
        document.getElementById('mainNav').classList.toggle('open');
    });
}

// Global filter by type (for footer links)
function filterByType(type) {
    activeType = type;
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.filter === type);
    });
    currentPage = 0;
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== LOAD DATA ==========
async function loadJobs() {
    try {
        const resp = await fetch('data/jobs.json');
        if (!resp.ok) throw new Error('Failed to load jobs');
        allJobs = await resp.json();
        document.querySelectorAll('.skeleton-card').forEach(s => s.remove());
        updateStats();
        applyFilters();
    } catch (err) {
        console.error('Load error:', err);
        document.getElementById('jobGrid').innerHTML = `
            <div class="no-results" style="grid-column: 1/-1">
                <div class="no-results-icon">⚠️</div>
                <h3>Data not available</h3>
                <p>Please try again later. We might be updating our database.</p>
            </div>`;
        document.getElementById('resultCount').textContent = 'Unable to load data';
    }
}

// ========== FILTER & SORT ==========
function applyFilters() {
    filteredJobs = allJobs.filter(job => {
        if (activeType !== 'all' && job.type !== activeType) return false;
        if (activeCategory !== 'all' && job.category !== activeCategory) return false;
        if (searchQuery) {
            const q = searchQuery;
            const searchIn = [
                job.title, job.organization, job.post_name,
                job.qualification, job.category, job.type, job.description
            ].filter(Boolean).join(' ').toLowerCase();
            if (!searchIn.includes(q)) return false;
        }
        return true;
    });

    // Sort
    filteredJobs.sort((a, b) => {
        if (sortMode === 'newest') return (b.sort_date || '').localeCompare(a.sort_date || '');
        if (sortMode === 'oldest') return (a.sort_date || '').localeCompare(b.sort_date || '');
        if (sortMode === 'deadline') return (a.sort_deadline || '9999').localeCompare(b.sort_deadline || '9999');
        return 0;
    });

    document.getElementById('resultCount').textContent = `Showing ${filteredJobs.length} update${filteredJobs.length !== 1 ? 's' : ''}`;
    document.getElementById('noResults').hidden = filteredJobs.length > 0;
    document.getElementById('loadMoreWrapper').hidden = filteredJobs.length <= PAGE_SIZE;

    renderJobs(true);
}

// ========== RENDER ==========
function renderJobs(reset) {
    const grid = document.getElementById('jobGrid');
    if (reset) {
        grid.innerHTML = '';
        currentPage = 0;
    }

    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageJobs = filteredJobs.slice(start, end);

    pageJobs.forEach(job => {
        grid.insertAdjacentHTML('beforeend', createCardHTML(job));
    });

    document.getElementById('loadMoreWrapper').hidden = end >= filteredJobs.length;
}

function createCardHTML(job) {
    const tc = TYPE_CONFIG[job.type] || TYPE_CONFIG.update;
    const deadlineHTML = job.last_date ? createDeadlineHTML(job.last_date) : '';
    const linksHTML = createLinksHTML(job);
    const descriptionHTML = job.description ? `<div class="meta-row"><span class="meta-label">Details</span><span>${escapeHtml(job.description)}</span></div>` : '';

    const metaRows = [];
    if (job.post_name) metaRows.push(`<div class="meta-row"><span class="meta-label">Post</span><span>${escapeHtml(job.post_name)}</span></div>`);
    if (job.vacancies) metaRows.push(`<div class="meta-row"><span class="meta-label">Vacancies</span><span><strong>${escapeHtml(job.vacancies)}</strong></span></div>`);
    if (job.qualification) metaRows.push(`<div class="meta-row"><span class="meta-label">Qualification</span><span>${escapeHtml(job.qualification)}</span></div>`);
    if (job.exam_name) metaRows.push(`<div class="meta-row"><span class="meta-label">Exam</span><span>${escapeHtml(job.exam_name)}</span></div>`);
    if (job.salary) metaRows.push(`<div class="meta-row"><span class="meta-label">Salary</span><span>${escapeHtml(job.salary)}</span></div>`);
    if (job.exam_date) metaRows.push(`<div class="meta-row"><span class="meta-label">Exam Date</span><span>${escapeHtml(job.exam_date)}</span></div>`);
    if (job.next_step) metaRows.push(`<div class="meta-row"><span class="meta-label">Next Step</span><span>${escapeHtml(job.next_step)}</span></div>`);
    if (job.qualified_count) metaRows.push(`<div class="meta-row"><span class="meta-label">Qualified</span><span>${escapeHtml(job.qualified_count)}</span></div>`);
    metaRows.push(descriptionHTML);

    const orgLine = job.organization ? `<div class="meta-row"><span class="meta-label">Organization</span><span><strong>${escapeHtml(job.organization)}</strong></span></div>` : '';

    const dateStr = job.posted_date ? formatDate(job.posted_date) : '';

    return `<article class="job-card">
        <div class="card-header">
            <span class="type-badge ${job.type}">${tc.icon} ${tc.label}</span>
            <span class="cat-badge ${escapeHtml(job.category)}">${escapeHtml(job.category)}</span>
        </div>
        <div class="card-body">
            <h3 class="card-title">${escapeHtml(job.title)}</h3>
            ${deadlineHTML}
            <div class="card-meta">
                ${orgLine}
                ${metaRows.join('')}
            </div>
            ${linksHTML}
            ${dateStr ? `<div class="card-date">📅 Posted ${dateStr}</div>` : ''}
        </div>
    </article>`;
}

function createDeadlineHTML(lastDate) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const parts = lastDate.split(/[\s,/]+/);
    let deadlineDate = null;
    try {
        const cleaned = lastDate.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
        deadlineDate = new Date(cleaned);
        if (isNaN(deadlineDate.getTime())) deadlineDate = null;
    } catch(e) {}

    let daysLeft = null;
    let urgent = false;
    if (deadlineDate) {
        daysLeft = Math.ceil((deadlineDate - today) / (1000*60*60*24));
        if (daysLeft <= 3 && daysLeft >= 0) urgent = true;
    }

    let text = `Last Date: ${lastDate}`;
    if (daysLeft !== null && daysLeft >= 0) text += ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`;
    else if (daysLeft !== null && daysLeft < 0) text += ` (Closed)`;

    return `<div class="deadline-banner">
        <span class="deadline-icon">⏰</span>
        <span class="deadline-text${urgent ? ' urgent' : ''}">${text}</span>
    </div>`;
}

function createLinksHTML(job) {
    const links = [];
    if (job.type === 'recruitment') {
        if (job.official_link) links.push(`<a href="${escapeHtml(job.official_link)}" target="_blank" rel="noopener" class="card-link primary">Apply Online →</a>`);
        if (job.notification_pdf) links.push(`<a href="${escapeHtml(job.notification_pdf)}" target="_blank" rel="noopener" class="card-link secondary">Notification PDF</a>`);
        if (job.official_website) links.push(`<a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" class="card-link official">Official Website</a>`);
    } else if (job.type === 'admit_card') {
        if (job.download_link) links.push(`<a href="${escapeHtml(job.download_link)}" target="_blank" rel="noopener" class="card-link primary">Download Admit Card →</a>`);
        if (job.official_website) links.push(`<a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" class="card-link official">Official Website</a>`);
    } else if (job.type === 'answer_key') {
        if (job.download_link) links.push(`<a href="${escapeHtml(job.download_link)}" target="_blank" rel="noopener" class="card-link primary">Download Answer Key →</a>`);
        if (job.official_website) links.push(`<a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" class="card-link official">Official Website</a>`);
    } else if (job.type === 'result') {
        if (job.download_link) links.push(`<a href="${escapeHtml(job.download_link)}" target="_blank" rel="noopener" class="card-link primary">Check Result →</a>`);
        if (job.official_website) links.push(`<a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" class="card-link official">Official Website</a>`);
    } else if (job.type === 'syllabus') {
        if (job.download_link) links.push(`<a href="${escapeHtml(job.download_link)}" target="_blank" rel="noopener" class="card-link primary">Download Syllabus →</a>`);
        if (job.official_website) links.push(`<a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" class="card-link official">Official Website</a>`);
    } else {
        if (job.official_link || job.download_link) {
            const url = job.official_link || job.download_link;
            links.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="card-link primary">Official Link →</a>`);
        }
        if (job.official_website) links.push(`<a href="${escapeHtml(job.official_website)}" target="_blank" rel="noopener" class="card-link official">Official Website</a>`);
    }
    return links.length ? `<div class="card-links">${links.join('')}</div>` : '';
}

// ========== STATS ==========
function updateStats() {
    const total = allJobs.length;
    const recruitment = allJobs.filter(j => j.type === 'recruitment').length;
    const admit = allJobs.filter(j => j.type === 'admit_card').length;
    const result = allJobs.filter(j => j.type === 'result').length;

    animateCounter('statTotal', total);
    animateCounter('statRecruitment', recruitment);
    animateCounter('statAdmit', admit);
    animateCounter('statResult', result);
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current;
    }, 30);
}

// ========== UTILS ==========
function escapeHtml(str) {
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