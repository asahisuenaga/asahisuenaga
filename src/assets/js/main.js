window.i18n?.init();

const menu = document.querySelector('.nav-menu');
const links = [...document.querySelectorAll('.nav-menu a[href^="#"]')];
const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

const updateNavIndicator = () => {
  const active = menu?.querySelector('a.active');
  if (active && menu) {
    const activeRect = active.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const t = activeRect.top - menuRect.top;
    const h = activeRect.height;

    requestAnimationFrame(() => {
      menu.style.setProperty('--indicator-top', `${t + h / 2 - 10}px`);
    });
  }
};

const setActiveNavLink = id => {
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
  updateNavIndicator();
};

const updateActiveNavLink = () => {
  let id = 'about', { scrollY: y, innerHeight: h } = window, { scrollHeight: sh } = document.body;
  if (y >= 100 && h + y < sh - 100) {
    let max = 0;
    sections.forEach(s => {
      const r = s.getBoundingClientRect(), v = Math.min(h, r.bottom) - Math.max(0, r.top);
      if (v > max) { max = v; id = s.id; }
    });
  } else if (h + y >= sh - 100) id = 'experience';
  if (id) setActiveNavLink(id);
};

const handleNavClick = (id, e) => {
  e.preventDefault();
  if (id === 'about') window.scrollTo(0, 0);
  else {
    const t = document.getElementById(id);
    if (t) window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 40);
  }
  setActiveNavLink(id);
};

links.forEach(l => l.addEventListener('click', e => handleNavClick(l.getAttribute('href').slice(1), e)));
document.querySelector('.nav > div > a[href="."]')?.addEventListener('click', e => handleNavClick('about', e));

const reconcile = () => requestAnimationFrame(() => {
  updateActiveNavLink();
  updateNavIndicator();
  menu?.classList.add('ready');
});

updateNavIndicator();
['scroll', 'resize'].forEach(e => window.addEventListener(e, updateActiveNavLink, { passive: true }));
['load', 'pageshow'].forEach(e => window.addEventListener(e, reconcile));

const lightThemeAccentColors = ['#991b1b', '#b45309', '#c2410c', '#78350f', '#0f766e', '#166534', '#1d4ed8', '#4338ca', '#6b21a8', '#9d174d'];
const darkThemeAccentColors  = ['#f06271', '#f59e0b', '#f97316', '#d97706', '#2dd4bf', '#4ade80', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
const accentColors = window.matchMedia('(prefers-color-scheme: dark)').matches ? darkThemeAccentColors : lightThemeAccentColors;
const root = document.documentElement;

const savedColor = localStorage.getItem('savedAccentColor');
if (savedColor) {
  root.style.setProperty('--accent', savedColor);
}

document.querySelector('.color-link')?.addEventListener('click', e => {
  e.preventDefault();
  const cur = getComputedStyle(root).getPropertyValue('--accent').trim().toLowerCase();
  const pool = accentColors.filter(c => c.toLowerCase() !== cur);
  const nextColor = (pool.length ? pool : accentColors)[Math.floor(Math.random() * (pool.length || accentColors.length))];
  root.style.setProperty('--accent', nextColor);
  localStorage.setItem('savedAccentColor', nextColor);

  const inner = e.currentTarget.querySelector('.color-dot-inner');
  if (inner) {
    inner.classList.remove('pop');
    setTimeout(() => {
      inner.classList.add('pop');
    }, 0);
  }
});


const lottie = document.getElementById('lottie');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const updateTheme = isDark => lottie && (lottie.style.filter = isDark ? 'invert(1)' : '');
updateTheme(darkQuery.matches);
darkQuery.addEventListener('change', e => updateTheme(e.matches));

const tabs = document.querySelectorAll('.ask-ai-tab');
tabs.forEach(t => t.addEventListener('click', e => {
  e.stopPropagation();
  tabs.forEach(tab => tab.classList.remove('active'));
  t.classList.add('active');
}));

const providerChains = {
  chatgpt: 'https://chatgpt.com/?q=',
  claude: 'https://claude.ai/new?q=',
  gemini: 'https://www.google.com/search?udm=50&source=searchlabs&q='
};

const askAiTrack = document.querySelector('.slot-placeholder-track');
const slotItems = [...document.querySelectorAll('.slot-item')];

const askAiSendHandler = e => {
  e.preventDefault();
  const matrix = getComputedStyle(askAiTrack).transform.match(/matrix\((.+)\)/);
  const translateY = matrix ? -matrix[1].split(',')[5] : 0;
  const firstItemHeight = slotItems[0]?.getBoundingClientRect().height || 22.4;
  const idx = Math.min(slotItems.length - 1, Math.round(translateY / firstItemHeight));
  const provider = document.querySelector('.ask-ai-tab.active')?.dataset.provider;
  const url = providerChains[provider] || providerChains.chatgpt;
  const text = slotItems[idx].textContent.trim();
  const context = "Context: You are being asked about Asahi Suenaga. Asahi is a Computer Science student at Michigan State University (MSU) focused on Swift and iOS development. Assist the visitor of Asahi's portfolio website. Answer directly and concisely, in plain text. Base your answer on Asahi's portfolio: About section, programming languages (HTML, CSS, JavaScript proficient; Python, TypeScript familiar), projects (Apple Notes Clone [Web Application], Baroque Jigsaw Puzzles [React Application], Rainbow Cursor for Google Docs [Chrome Extension; Second Most Popular Repo], Hide Google AI Overviews and Mode [Chrome Extension; Most Popular Repo]), and experience (SpartaHack Finance Team, Japanese Student Association Secretary). If the underlying fact is not on the portfolio or in asahisuenaga.com, say so honestly rather than guessing.";
  
  window.open(`${url}${encodeURIComponent(`${text}\n\n${context}`).replace(/%20/g, '+')}`, '_blank', 'noopener,noreferrer');
};

const askAiSend = document.querySelector('.ask-ai-send');
askAiSend?.addEventListener('click', askAiSendHandler);
