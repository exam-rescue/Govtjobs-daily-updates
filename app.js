// ========== STATE ==========
let allJobs = [];
let filteredJobs = [];
let currentPage = 0;
const PAGE_SIZE = 20;
let activeType = 'all';
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'deadline';
let viewMode = 'grid';

const TYPE_CONFIG = {
    recruitment: { label: 'Recruitment', icon: '&#128188;' },
    admit_card:  { label: 'Admit Card', icon: '&#127915;' },
    answer_key:  { label: 'Answer Key', icon: '&#9998;' },
    result:      { label: 'Result', icon: '&#128202;' },
    syllabus:    { label: 'Syllabus', icon: '&#128214;' },
    update:      { label: 'Update', icon: '&#128276;' },
};

const SECTION_TITLES = {
    all: 'Latest Government Updates',
    recruitment: 'Latest Government Job Notifications',
    admit_card: 'Latest Admit Card Releases',
    answer_key: 'Latest Answer Key Releases',
    result: 'Latest Exam Results',
    syllabus: 'Latest Syllabus Updates',
    update: 'Latest Notices & Updates',
};

const STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
    'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
    'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
    'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
    'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
    'Chandigarh','Puducherry','Andaman & Nicobar','Lakshadweep'
];

const QUALIFICATIONS = [
    '10th Pass','12th Pass','Graduate','Post Graduate','Engineering','Diploma',
    'ITI','Medical','Teaching','Computer / IT','Commerce','Law','PhD'
];

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEvents();
    buildBrowseGrids();
    buildFooterStates();
    buildSidebarQual();
});

function setupEvents() {
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    let timer;
    searchInput.addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => {
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
    });

    // Desktop nav
    document.querySelectorAll('.dnav-link').forEach(l => {
        l.addEventListener('click', e => { e.preventDefault(); setActiveFilter(l.dataset.filter); });
    });

    // Mobile tabs
    document.querySelectorAll('.mobile-tab').forEach(t => {
        t.addEventListener('click', () => {
            setActiveFilter(t.dataset.filter);
            t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
    });

    // Category chips
    document.querySelectorAll('#categoryFilters .fchip').forEach(c => {
        c.addEventListener('click', () => {
            document.querySelectorAll('#categoryFilters .fchip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            activeCategory = c.dataset.value;
            currentPage = 0;
            applyFilters();
        });
    });

    // Sidebar category links
    document.querySelectorAll('.sb-link[data-cat]').forEach(l => {
        l.addEventListener('click', e => {
            e.preventDefault();
            const cat = l.dataset.cat;
            activeCategory = (activeCategory === cat) ? 'all' : cat;
            document.querySelectorAll('#categoryFilters .fchip').forEach(c => {
                c.classList.toggle('active', c.dataset.value === activeCategory);
            });
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
    document.querySelectorAll('.vbtn').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.vbtn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            viewMode = b.dataset.view;
            document.getElementById('jobGrid').classList.toggle('list-view', viewMode === 'list');
        });
    });

    // Load more
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        renderJobs(false);
    });

    // FAQ accordion
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isOpen = item.classList.contains('open');
            // Close all
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            document.querySelectorAll('.faq-q').forEach(q => q.setAttribute('aria-expanded', 'false'));
            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function setActiveFilter(type) {
    activeType = type;
    currentPage = 0;
    document.querySelectorAll('.dnav-link').forEach(l => l.classList.toggle('active', l.dataset.filter === type));
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === type));
    applyFilters();
    // Scroll to content on desktop
    if (window.innerWidth > 768) {
        document.getElementById('filterBar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ========== LOAD DATA ==========
async function loadJobs() {
    try {
        const resp = await fetch('data/jobs.json');
        if (!resp.ok) throw new Error('Failed');
        allJobs = await resp.json();
        document.querySelectorAll('.skel-card').forEach(s => s.remove());
        updateStats();
        populateSidebar();
        applyFilters();
    } catch (err) {
        console.error('Load error:', err);
        document.getElementById('jobGrid').innerHTML = `
            <div class="no-results" style="grid-column:1/-1">
                <div class="nr-icon">&#9888;&#65039;</div>
                <h3>Data not available</h3>
                <p>Please try again later. We might be updating our database.</p>
            </div>`;
        document.getElementById('sectionCount').textContent = 'Unable to load';
    }
}

// ========== FILTER & SORT ==========
function applyFilters() {
    filteredJobs = allJobs.filter(j => {
        if (activeType !== 'all' && j.type !== activeType) return false;
        if (activeCategory !== 'all' && j.category !== activeCategory) return false;
        if (searchQuery) {
            const q = searchQuery;
            const hay = [j.title, j.organization, j.post_name, j.qualification, j.category, j.type, j.description].filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    filteredJobs.sort((a, b) => {
        if (sortMode === 'deadline') {
            const da = a.sort_deadline || '9999';
            const db = b.sort_deadline || '9999';
            const c = da.localeCompare(db);
            return c !== 0 ? c : (b.sort_date || '').localeCompare(a.sort_date || '');
        }
        if (sortMode === 'deadline_soon') {
            const da = a.sort_deadline || '9999';
            const db = b.sort_deadline || '9999';
            const c = da.localeCompare(db);
            return c !== 0 ? c : (b.sort_date || '').localeCompare(a.sort_date || '');
        }
        if (sortMode === 'newest') return (b.sort_date || '').localeCompare(a.sort_date || '');
        if (sortMode === 'oldest') return (a.sort_date || '').localeCompare(b.sort_date || '');
        return 0;
    });

    // Update section title
    document.getElementById('sectionTitle').textContent = SECTION_TITLES[activeType] || 'Latest Government Updates';
    document.getElementById('sectionCount').textContent = `Showing ${filteredJobs.length} result${filteredJobs.length !== 1 ? 's' : ''}`;
    document.getElementById('noResults').hidden = filteredJobs.length > 0;
    document.getElementById('loadMoreArea').hidden = filteredJobs.length <= PAGE_SIZE;
    renderJobs(true);
}

// ========== RENDER ==========
function renderJobs(reset) {
    const grid = document.getElementById('jobGrid');
    if (reset) { grid.innerHTML = ''; currentPage = 0; }
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const page = filteredJobs.slice(start, end);
    page.forEach(j => grid.insertAdjacentHTML('beforeend', createCard(j)));
    document.getElementById('loadMoreArea').hidden = end >= filteredJobs.length;
}

function createCard(j) {
    const tc = TYPE_CONFIG[j.type] || TYPE_CONFIG.update;
    const deadlineInfo = getDeadlineInfo(j.last_date);
    const url = `post.html?id=${j.id}`;
    const tgShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(j.title)}`;
    const waShare = `https://wa.me/?text=${encodeURIComponent(j.title + ' ' + url)}`;

    const metaItems = [];
    if (j.organization) metaItems.push(`<span class="meta-item"><strong>${esc(j.organization)}</strong></span>`);
    if (j.vacancies) metaItems.push(`<span class="meta-item">&#128188; ${esc(j.vacancies)}</span>`);
    if (j.qualification) metaItems.push(`<span class="meta-item">&#127891; ${esc(j.qualification)}</span>`);
    if (j.salary) metaItems.push(`<span class="meta-item">&#128176; ${esc(j.salary)}</span>`);
    if (j.exam_date) metaItems.push(`<span class="meta-item">&#128197; ${esc(j.exam_date)}</span>`);

    return `<a href="${url}" class="job-card">
        <div class="card-top">
            <div class="card-badges">
                <span class="type-pill ${j.type}">${tc.icon} ${tc.label}</span>
                ${j.trending ? '<span class="trending-pill">&#128293; Hot</span>' : ''}
            </div>
            ${j.last_date ? `<span class="card-deadline ${deadlineInfo.cls}">${deadlineInfo.text}</span>` : ''}
        </div>
        <div class="card-body">
            <h3 class="card-title">${esc(j.title)}</h3>
            <div class="card-meta">${metaItems.join('')}</div>
        </div>
        <div class="card-foot">
            <span>${j.posted_date ? formatDate(j.posted_date) : ''}</span>
            <div class="card-share">
                <a href="${tgShare}" target="_blank" class="share-mini tg" title="Share on Telegram" onclick="event.stopPropagation()">&#9993;</a>
                <a href="${waShare}" target="_blank" class="share-mini wa" title="Share on WhatsApp" onclick="event.stopPropagation()">&#9742;</a>
            </div>
        </div>
    </a>`;
}

function getDeadlineInfo(lastDate) {
    if (!lastDate) return { text: '', cls: '' };
    const today = new Date(); today.setHours(0,0,0,0);
    let d = null;
    try { d = new Date(lastDate.replace(/(\d+)(st|nd|rd|th)/gi, '$1')); if (isNaN(d.getTime())) d = null; } catch(e) {}
    if (!d) return { text: lastDate, cls: '' };
    const diff = Math.ceil((d - today) / 86400000);
    if (diff < 0) return { text: `${lastDate} (Closed)`, cls: 'deadline-closed' };
    if (diff <= 3) return { text: `${diff} day${diff !== 1 ? 's' : ''} left!`, cls: 'deadline-urgent' };
    return { text: `${diff} days left`, cls: 'deadline-active' };
}

// ========== STATS ==========
function updateStats() {
    animateCounter('statTotal', allJobs.length);
    animateCounter('statRecruitment', allJobs.filter(j => j.type === 'recruitment').length);
    animateCounter('statAdmit', allJobs.filter(j => j.type === 'admit_card').length);
    animateCounter('statResult', allJobs.filter(j => j.type === 'result').length);
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 25));
    const t = setInterval(() => {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(t); }
        el.textContent = cur;
    }, 30);
}

// ========== SIDEBAR ==========
function populateSidebar() {
    // Trending: top 5 recruitment jobs with upcoming deadlines
    const trending = allJobs
        .filter(j => j.type === 'recruitment' && j.sort_deadline && j.sort_deadline < '2026-08')
        .sort((a, b) => a.sort_deadline.localeCompare(b.sort_deadline))
        .slice(0, 5);

    const container = document.getElementById('sidebarTrending');
    if (trending.length === 0) {
        container.innerHTML = '<p style="font-size:12px;color:var(--text-4)">No trending jobs right now</p>';
        return;
    }
    container.innerHTML = trending.map((j, i) => {
        const url = `post.html?id=${j.id}`;
        return `<a href="${url}" class="sb-item">
            <span class="sb-item-num">${i + 1}</span>
            <span class="sb-item-text">${esc(j.title)}</span>
        </a>`;
    }).join('');
}

// ========== BROWSE GRIDS ==========
function buildBrowseGrids() {
    // States
    const stateGrid = document.getElementById('stateGrid');
    stateGrid.innerHTML = STATES.map(s => {
        const count = allJobs.filter(j => j.title && j.title.toLowerCase().includes(s.toLowerCase().split(' ')[0].toLowerCase())).length;
        return `<button class="browse-btn" onclick="searchState('${s.replace(/'/g, "\\'")}')">${s}<span class="bb-count">${count} updates</span></button>`;
    }).join('');

    // Qualifications
    const qualGrid = document.getElementById('qualGrid');
    qualGrid.innerHTML = QUALIFICATIONS.map(q => {
        const count = allJobs.filter(j => j.qualification && j.qualification.toLowerCase().includes(q.toLowerCase().split(' ')[0].toLowerCase())).length;
        return `<button class="browse-btn" onclick="searchQual('${q.replace(/'/g, "\\'")}')">${q}<span class="bb-count">${count} updates</span></button>`;
    }).join('');
}

function searchState(state) {
    document.getElementById('searchInput').value = state;
    searchQuery = state.toLowerCase().split(' ')[0];
    document.getElementById('searchClear').hidden = false;
    currentPage = 0;
    applyFilters();
    document.getElementById('filterBar').scrollIntoView({ behavior: 'smooth' });
}

function searchQual(qual) {
    document.getElementById('searchInput').value = qual;
    searchQuery = qual.toLowerCase().split(' ')[0];
    document.getElementById('searchClear').hidden = false;
    currentPage = 0;
    applyFilters();
    document.getElementById('filterBar').scrollIntoView({ behavior: 'smooth' });
}

// ========== FOOTER STATES ==========
function buildFooterStates() {
    const el = document.getElementById('footerStates');
    el.innerHTML = STATES.slice(0, 12).map(s =>
        `<a href="#" onclick="searchState('${s.replace(/'/g, "\\'")}');return false;">${s}</a>`
    ).join('');
}

// ========== SIDEBAR QUAL ==========
function buildSidebarQual() {
    const el = document.getElementById('sidebarQual');
    el.innerHTML = QUALIFICATIONS.map(q =>
        `<button class="sb-qual-tag" onclick="searchQual('${q.replace(/'/g, "\\'")}')">${q}</button>`
    ).join('');
}

// ========== UTILS ==========
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

// Mark trending jobs (deadline within 30 days + recruitment)
function markTrending() {
    const now = new Date();
    allJobs.forEach(j => {
        if (j.type === 'recruitment' && j.last_date) {
            try {
                const d = new Date(j.last_date.replace(/(\d+)(st|nd|rd|th)/gi, '$1'));
                const diff = (d - now) / 86400000;
                j.trending = diff >= 0 && diff <= 30;
            } catch(e) { j.trending = false; }
        } else {
            j.trending = false;
        }
    });
}
// Hook into loadJobs to mark trending
const origLoad = loadJobs;
loadJobs = async function() {
    await origLoad();
    markTrending();
    populateSidebar();
    applyFilters();
};