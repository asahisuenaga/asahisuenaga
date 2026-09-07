window.i18n?.init();

const menu = document.querySelector('.dropdown-menu');
const links = [...document.querySelectorAll('.dropdown-menu a[href^="#"]')];
const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

const updateNavIndicator = () => {
  const active = menu?.querySelector('a.active');
  if (active) menu.style.setProperty('--indicator-top', `${active.offsetTop + active.offsetHeight / 2 - 10}px`);
};

const setActiveNavLink = id => {
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
  updateNavIndicator();
};

const updateActiveNavLink = () => {
  let id = 'about';
  if (window.scrollY >= 100 && window.innerHeight + window.scrollY < document.body.scrollHeight - 100) {
    let best = 0;
    sections.forEach(s => {
      const r = s.getBoundingClientRect();
      const v = Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top);
      if (v > best) { best = v; id = s.id; }
    });
  } else if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
    id = 'experience';
  }
  if (id) setActiveNavLink(id);
};

const scrollToSection = id => {
  if (id === 'about') return window.scrollTo(0, 0);
  const target = document.getElementById(id);
  if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 40);
};

const handleNavClick = (id, e) => {
  e.preventDefault();
  scrollToSection(id);
  setActiveNavLink(id);
};

links.forEach(l => l.addEventListener('click', e => handleNavClick(l.getAttribute('href').slice(1), e)));
document.querySelector('.nav > div > a[href="."]')?.addEventListener('click', e => handleNavClick('about', e));

updateNavIndicator();
['scroll', 'resize'].forEach(e => window.addEventListener(e, updateActiveNavLink, { passive: true }));

const reconcile = () => requestAnimationFrame(() => {
  updateActiveNavLink();
  updateNavIndicator();
  menu?.classList.add('ready');
});
['load', 'pageshow'].forEach(e => window.addEventListener(e, reconcile));

const accentColors = ['#b0313f', '#b45309', '#c55126', '#a16a40', '#238378', '#1e864a', '#257ea6', '#6264ee', '#9c4fe5', '#cd3e85'];
const root = document.documentElement;

document.querySelector('.color-link')?.addEventListener('click', e => {
  e.preventDefault();
  const cur = getComputedStyle(root).getPropertyValue('--accent').trim().toLowerCase();
  const pool = accentColors.filter(c => c.toLowerCase() !== cur);
  root.style.setProperty('--accent', (pool.length ? pool : accentColors)[Math.floor(Math.random() * (pool.length || accentColors.length))]);
  const inner = e.currentTarget.querySelector('.color-dot-inner');
  if (inner) {
    inner.classList.remove('pop');
    void inner.offsetWidth;
    inner.classList.add('pop');
  }
});

const lottie = document.getElementById('lottie');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const updateTheme = isDark => lottie && (lottie.style.filter = isDark ? 'invert(1)' : '');
updateTheme(darkQuery.matches);
darkQuery.addEventListener('change', e => updateTheme(e.matches));

const tabs = document.querySelectorAll('.ask-ai-tab');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(tab => tab.classList.remove('active'));
  t.classList.add('active');
}));

const providerChains = {
  chatgpt: 'https://chatgpt.com/?q=',
  claude: 'https://claude.ai/new?q=',
  gemini: 'https://www.google.com/search?udm=50&source=searchlabs&q='
};

const askAiSend = document.querySelector('.ask-ai-input');
const askAiTrack = document.querySelector('.slot-placeholder-track');
const slotItems = [...document.querySelectorAll('.slot-item')];

const askAiSendHandler = e => {
  e.preventDefault();
  const matrix = getComputedStyle(askAiTrack).transform.match(/matrix\((.+)\)/);
  const translateY = matrix ? -matrix[1].split(',')[5] : 0;
  const idx = Math.min(slotItems.length - 1, Math.round(translateY / (slotItems[0]?.offsetHeight || 22.4)));
  
  const provider = document.querySelector('.ask-ai-tab.active')?.dataset.provider;
  const url = providerChains[provider] || providerChains.chatgpt;
  
  const text = slotItems[idx].textContent.trim();
  const context = "Context: You are being asked about Asahi Suenaga. Asahi is a Computer Science student at Michigan State University (MSU) focused on Swift and iOS development. Assist the visitor of Asahi's portfolio website. Answer directly and concisely, in plain text. Base your answer on Asahi's portfolio: About section, programming languages (HTML, CSS, JavaScript proficient; Python, TypeScript familiar), projects (Apple Notes Clone [Web Application], Baroque Jigsaw Puzzles [React Application], Rainbow Cursor for Google Docs [Chrome Extension; Second Most Popular Repo], Hide Google AI Overviews and Mode [Chrome Extension; Most Popular Repo]), and experience (SpartaHack Finance Team, Japanese Student Association Secretary). If the underlying fact is not on the portfolio or in asahisuenaga.com, say so honestly rather than guessing.";
  
  window.open(url + encodeURIComponent(`${text}\n\n${context}`).replace(/%20/g, '+'), '_blank', 'noopener,noreferrer');
};

askAiSend?.addEventListener('click', askAiSendHandler);
askAiSend?.addEventListener('keydown', e => ['Enter', ' '].includes(e.key) && askAiSendHandler(e));

document.querySelectorAll('.table-row-link').forEach(row => {
  const handler = e => {
    if (e.target.closest('a')) return;
    const href = row.dataset.href;
    if (!href) return;
    href.startsWith('/') ? window.location.href = href : window.open(href, '_blank', 'noopener,noreferrer');
  };
  row.addEventListener('click', handler);
  row.addEventListener('keydown', e => {
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault();
      handler(e);
    }
  });
});