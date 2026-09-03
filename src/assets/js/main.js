window.i18n?.init();

const dropdownMenu = document.querySelector('.dropdown-menu');
const INDICATOR_MIDPOINT_OFFSET = 10;
const SCROLL_OFFSET = 40;

const navLinks = Array.from(document.querySelectorAll('.dropdown-menu a[href^="#"]'));
const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

const updateNavIndicator = () => {
    if (!dropdownMenu) return;
    const activeLink = dropdownMenu.querySelector('a.active');
    if (!activeLink) return;
    const top = activeLink.offsetTop + activeLink.offsetHeight / 2 - INDICATOR_MIDPOINT_OFFSET;
    dropdownMenu.style.setProperty('--indicator-top', `${top}px`);
};

const setActiveNavLink = (id) => {
    navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
    updateNavIndicator();
};

const getMostVisibleSectionId = () => {
    let bestVisible = 0;
    let bestId = null;

    navSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visible = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
        if (visible > bestVisible) {
            bestVisible = visible;
            bestId = section.id;
        }
    });

    return bestId;
};

const updateActiveNavLink = () => {
    let activeId;

    if (window.scrollY < 100) {
        activeId = 'about';
    } else if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
        activeId = 'experience';
    } else {
        activeId = getMostVisibleSectionId();
    }

    if (activeId) setActiveNavLink(activeId);
};

const scrollToSection = (id) => {
    if (id === 'about') {
        window.scrollTo(0, 0);
        return;
    }

    const target = document.getElementById(id);
    if (target) {
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET);
    }
};

navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const id = link.getAttribute('href').slice(1);
        scrollToSection(id);
        setActiveNavLink(id);
    });
});

const lottieLink = document.querySelector('.nav > div > a[href="."]');
if (lottieLink) {
    lottieLink.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToSection('about');
        setActiveNavLink('about');
    });
}

updateNavIndicator();

window.addEventListener('scroll', updateActiveNavLink, { passive: true });
window.addEventListener('resize', updateActiveNavLink);

const reconcileActiveNav = () => {
    requestAnimationFrame(() => {
        updateActiveNavLink();
        updateNavIndicator();
        if (dropdownMenu) dropdownMenu.classList.add('ready');
    });
};

window.addEventListener('load', reconcileActiveNav);
window.addEventListener('pageshow', reconcileActiveNav);

const accentColors = [ 
  '#b0313f', '#b45309', '#c55126', '#a16a40', '#238378', 
  '#1e864a', '#257ea6', '#6264ee', '#9c4fe5', '#cd3e85',
];

const root = document.documentElement;

const getRandomAccentColor = () => { 
  const current = getComputedStyle(root).getPropertyValue('--accent').trim().toLowerCase(); 
  const candidates = accentColors.filter((color) => color.toLowerCase() !== current); 
  const pool = candidates.length > 0 ? candidates : accentColors; 
  return pool[Math.floor(Math.random() * pool.length)];
};

const colorLink = document.querySelector('.color-link');
if (colorLink) {
    colorLink.addEventListener('click', (event) => {
        event.preventDefault();
        root.style.setProperty('--accent', getRandomAccentColor());
        const inner = colorLink.querySelector('.color-dot-inner');
        if (inner) {
            inner.classList.remove('pop');
            void inner.offsetWidth;
            inner.classList.add('pop');
        }
    });
}

const lottie = document.getElementById('lottie');
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const updateTheme = (isDark) => {
    if (!lottie) return;
    lottie.style.filter = isDark ? 'invert(1)' : '';
};

updateTheme(darkModeQuery.matches);
darkModeQuery.addEventListener('change', (e) => updateTheme(e.matches));

document.querySelectorAll('.ask-ai-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ask-ai-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

const providerChains = {
    chatgpt: 'https://chatgpt.com/?q=',
    claude: 'https://claude.ai/new?q=',
    gemini: 'https://www.google.com/search?udm=50&source=searchlabs&q=',
};

const askAiInput = document.querySelector('.ask-ai-input');
const askAiTrack = document.querySelector('.slot-placeholder-track');
const slotItems = Array.from(document.querySelectorAll('.slot-item'));
const askAiSend = document.querySelector('.ask-ai-input');

const getActiveSlotIndex = () => {
    const transform = getComputedStyle(askAiTrack).transform;
    if (!transform || transform === 'none') return 0;
    const matrix = transform.match(/matrix\((.+)\)/);
    if (!matrix) return 0;
    const values = matrix[1].split(',').map(Number);
    const translateY = -values[5];
    const itemHeight = slotItems[0].offsetHeight || 22.4;
    return Math.min(slotItems.length - 1, Math.round(translateY / itemHeight));
};

const getActiveProviderUrl = () => {
    const activeTab = document.querySelector('.ask-ai-tab.active');
    const provider = activeTab ? activeTab.dataset.provider : 'chatgpt';
    return providerChains[provider] || providerChains.chatgpt;
};

const askAiSendHandler = (event) => {
    event.preventDefault();
    const prompt = slotItems[getActiveSlotIndex()].textContent.trim();
    const instructions = [
        'You are being asked about Asahi Suenaga.',
        'Asahi is a Computer Science student at Michigan State University (MSU) focused on Swift and iOS development.',
        'Assist the visitor of Asahi\'s portfolio website.',
        'Answer directly and concisely, in plain text.',
        'Base your answer on Asahi\'s portfolio: About section, programming languages (HTML, CSS, JavaScript proficient; Python, TypeScript familiar), projects (Apple Notes Clone [Web Application], Baroque Jigsaw Puzzles [React Application], Rainbow Cursor for Google Docs [Chrome Extension; Second Most Popular Repo], Hide Google AI Overviews and Mode [Chrome Extension; Most Popular Repo]), and experience (SpartaHack Finance Team, Japanese Student Association Secretary).',
        'If the underlying fact is not on the portfolio or in asahisuenaga.com, say so honestly rather than guessing.',
    ].join(' ');
    const fullPrompt = `${prompt}\n\nContext: ${instructions}`;
    const encoded = encodeURIComponent(fullPrompt).replace(/%20/g, '+');
    window.open(getActiveProviderUrl() + encoded, '_blank', 'noopener,noreferrer');
};

askAiSend.addEventListener('click', askAiSendHandler);
askAiSend.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        askAiSendHandler(event);
    }
});

document.querySelectorAll('.table-row-link').forEach((row) => {
    const openRowLink = (event) => {
        if (event.target.closest('a')) {
            return;
        }

        const href = row.dataset.href;
        if (!href) return;

        if (href.startsWith('/')) {
            window.location.href = href;
            return;
        }

        window.open(href, '_blank', 'noopener,noreferrer');
    };

    row.addEventListener('click', openRowLink);
    row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openRowLink(event);
        }
    });
});