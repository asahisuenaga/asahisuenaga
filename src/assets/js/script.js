document.addEventListener('DOMContentLoaded', () => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (history.scrollRestoration) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const userLang = navigator.language || navigator.userLanguage;
    const isJa = userLang.startsWith('ja');
    let currentLang = isJa ? 'ja' : 'en';
    const nameEl = document.getElementById('name');

    window.translations = {};

    async function loadTranslations() {
        const [en, ja] = await Promise.all([
            fetch('/locales/en.json').then(r => r.json()),
            fetch('/locales/ja.json').then(r => r.json())
        ]);
        window.translations = { en, ja };
        applyLang(currentLang, false);
    }

    function applyLang(lang, animate = true) {
        const d = (window.translations || {})[lang];
        if (!d) return;

        const doSwap = () => {
            document.documentElement.lang = lang;
            document.title = d.site.pageTitle;
            if (nameEl) nameEl.innerText = d.site.title;
            const banner = document.getElementById('banner');
            if (banner) banner.innerText = d.site.banner;
            const locNode = document.getElementById('location');
            if (locNode) locNode.innerHTML = d.location;
            const b = document.getElementById('bio');
            if (b) b.innerHTML = d.bio;

            const actionNotes = document.getElementById('action-notes');
            if (actionNotes) actionNotes.innerText = d.actions.notes;
            const actionTwitter = document.getElementById('action-twitter');
            if (actionTwitter) actionTwitter.innerText = d.actions.twitter;
            const actionGithub = document.getElementById('action-github');
            if (actionGithub) actionGithub.innerText = d.actions.github;

            const twitterLink = document.querySelector('.twitter-link');
            if (twitterLink) twitterLink.setAttribute('aria-label', d.actions.twitter);
            const githubLink = document.querySelector('.github-link');
            if (githubLink) githubLink.setAttribute('aria-label', d.actions.github);

            const menuTranslate = document.getElementById('menu-translate-label');
            if (menuTranslate) menuTranslate.innerText = d.menu.translate;
            const menuDarkmode = document.getElementById('menu-darkmode-label');
            if (menuDarkmode) menuDarkmode.innerText = d.menu.darkmode;

            currentLang = lang;
            document.getElementById('menu-translate-badge').innerText = currentLang === 'ja' ? '字' : 'A';
            if (window.applyNotesLang) window.applyNotesLang(lang);
        };

        if (animate) {
            document.body.classList.add('lang-switching');
            requestAnimationFrame(() => {
                setTimeout(() => {
                    doSwap();
                    requestAnimationFrame(() => {
                        document.body.classList.remove('lang-switching');
                    });
                }, 150);
            });
        } else {
            doSwap();
        }
    }

    loadTranslations();

    document.getElementById('menu-darkmode-badge').innerText = document.body.classList.contains('dark-mode') || (window.matchMedia('(prefers-color-scheme: dark)').matches && !document.body.classList.contains('light-mode')) ? '✓' : '';

    let menuTimer;
    const ellipsisBtn = document.getElementById('ellipsis-btn');
    const ellipsisMenu = document.getElementById('ellipsis-menu');

    function closeMenu() {
        if (ellipsisMenu) {
            ellipsisMenu.classList.remove('open');
            ellipsisMenu.classList.add('close');
        }
    }

    function openMenu(focusFirst) {
        const githubStats = document.getElementById('github-stats');
        if (githubStats) { githubStats.classList.remove('open'); githubStats.classList.add('close'); }
        if (!ellipsisMenu || !ellipsisBtn) return;
        const rect = ellipsisBtn.getBoundingClientRect();
        ellipsisMenu.style.display = 'flex';
        const { width, height } = ellipsisMenu.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.bottom + 8;
        if (x + width / 2 > window.innerWidth - 10) x = window.innerWidth - 10 - width / 2;
        if (x - width / 2 < 10) x = 10 + width / 2;
        if (y + height > window.innerHeight - 10) y = rect.top - height - 8;
        ellipsisMenu.style.left = x + 'px';
        ellipsisMenu.style.top = y + 'px';
        ellipsisMenu.classList.remove('close');
        ellipsisMenu.classList.add('open');
        if (focusFirst) {
            const firstBtn = ellipsisMenu.querySelector('button');
            if (firstBtn) firstBtn.focus();
        }
    }

    if (!isTouch) {
        ellipsisBtn?.addEventListener('mouseenter', () => {
            clearTimeout(menuTimer);
            openMenu();
        });

        ellipsisBtn?.addEventListener('mouseleave', () => {
            menuTimer = setTimeout(() => {
                if (!ellipsisMenu?.matches(':hover')) {
                    closeMenu();
                }
            }, 200);
        });

        ellipsisMenu?.addEventListener('mouseenter', () => {
            clearTimeout(menuTimer);
        });

        ellipsisMenu?.addEventListener('mouseleave', () => {
            menuTimer = setTimeout(closeMenu, 200);
        });
    }

    let menuOpenedByKeyboard = false;

    ellipsisBtn?.addEventListener('click', (e) => {
        if (menuOpenedByKeyboard) { menuOpenedByKeyboard = false; return; }
        e.stopPropagation();
        clearTimeout(menuTimer);
        if (ellipsisMenu?.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    ellipsisBtn?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            menuOpenedByKeyboard = true;
            if (ellipsisMenu?.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu(true);
            }
        } else if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            closeMenu();
            const bioLink = document.querySelector('.bioLink');
            if (bioLink) bioLink.focus();
        }
    });

    window.addEventListener('resize', () => {
        if (ellipsisMenu?.classList.contains('open')) {
            openMenu();
        }
    });

    document.addEventListener('click', () => {
        closeMenu();
    });

    ellipsisMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    ellipsisMenu?.addEventListener('keydown', (e) => {
        const btns = Array.from(ellipsisMenu.querySelectorAll('button'));
        if (!btns.length) return;
        const idx = btns.indexOf(document.activeElement);
        if (e.key === 'Tab' && !e.shiftKey && idx === btns.length - 1) {
            e.preventDefault();
            btns[0].focus();
        } else if (e.key === 'Tab' && e.shiftKey && idx === 0) {
            e.preventDefault();
            btns[btns.length - 1].focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
            if (ellipsisBtn) ellipsisBtn.focus();
        }
    });

    document.getElementById('menu-translate')?.addEventListener('click', () => {
        applyLang(currentLang === 'ja' ? 'en' : 'ja');
        playBasicSound();
        document.getElementById('ellipsis-menu')?.classList.remove('open');
        closeMenu();
    });

    const isDarkEffective = () => document.body.classList.contains('dark-mode') || (window.matchMedia('(prefers-color-scheme: dark)').matches && !document.body.classList.contains('light-mode'));

    function syncColorScheme() {
        if (document.body.classList.contains('dark-mode')) {
            document.documentElement.style.colorScheme = 'dark';
        } else if (document.body.classList.contains('light-mode')) {
            document.documentElement.style.colorScheme = 'light';
        } else {
            document.documentElement.style.colorScheme = '';
        }
    }

    document.getElementById('menu-darkmode')?.addEventListener('click', () => {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (document.body.classList.contains('dark-mode') || document.body.classList.contains('light-mode')) {
            document.body.classList.remove('dark-mode', 'light-mode');
        } else {
            document.body.classList.add(systemDark ? 'light-mode' : 'dark-mode');
        }
        syncColorScheme();
        document.getElementById('menu-darkmode-badge').innerText = isDarkEffective() ? '✓' : '';
        playBasicSound();
        setTimeout(closeMenu, 400);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!document.body.classList.contains('dark-mode') && !document.body.classList.contains('light-mode')) {
            document.getElementById('menu-darkmode-badge').innerText = window.matchMedia('(prefers-color-scheme: dark)').matches ? '✓' : '';
        }
    });
    document.getElementById('menu-darkmode-badge').innerText = isDarkEffective() ? '✓' : '';

    const shrine = document.getElementById('shrine');
    let hoverInterval;

    if (!shrine) return;

    shrine.addEventListener('pointerenter', () => {
        hoverInterval = setInterval(() => {
            if (!shrine.classList.contains('holding') || Math.random() < 0.2) {
                createFirefly(shrine.classList.contains('holding') ? 0.8 : 1);
            }
        }, 200);

        for (let i = 0; i < 8; i++) {
            createFirefly(1.5);
        }
    });

    shrine.oncontextmenu = (e) => e.preventDefault();

    shrine.addEventListener('pointerleave', () => {
        clearInterval(hoverInterval);
        shrine.classList.remove('holding');
        shrine.classList.remove('post-press');
    });

    shrine.onpointerdown = (e) => {
        shrine.setPointerCapture(e.pointerId);
        shrine.classList.add('holding');
    };

    shrine.onpointerup = (e) => {
        if (!shrine.classList.contains('holding')) return;
        shrine.classList.remove('holding');

        shrine.classList.remove('pressed');
        void shrine.offsetWidth;
        shrine.classList.add('pressed');
        shrine.classList.add('post-press');

        for (let i = 0; i < 15; i++) {
            const randomLifetime = 1200 + Math.random() * 1300;
            createFirefly(1.5, randomLifetime);
        }

        setTimeout(() => {
            shrine.classList.remove('pressed');
        }, 600);
    };

    shrine.onpointercancel = () => {
        clearInterval(hoverInterval);
        shrine.classList.remove('holding');
        shrine.classList.remove('post-press');
    };

    function createFirefly(spreadMultiplier = 1, lifetime = 2000) {
        const p = document.createElement('div');
        p.className = 'firefly';

        const startX = Math.random() * 100;
        const startY = (Math.random() * 60) + 30;

        const driftX = (Math.random() - 0.5) * (80 * spreadMultiplier) + "px";
        const driftY = (Math.random() * -30 * spreadMultiplier) - 10 + "px";

        const r = (Math.random() - 0.5) * 360 + "deg";
        
        const color = `hsl(${45 + Math.random() * 15}, ${90 + Math.random() * 10}%, ${50 + Math.random() * 10}%)`;
        
        p.style.left = `${startX}%`;
        p.style.top = `${startY}%`;
        p.style.setProperty('--x', driftX);
        p.style.setProperty('--y', driftY);
        p.style.setProperty('--r', r);
        p.style.setProperty('--firefly-color', color);
        p.style.setProperty('--firefly-size', (3 + Math.random() * 0.5) + 'px');
        p.style.setProperty('--firefly-flicker', (0.7 + Math.random() * 0.8) + 's');
        p.style.animationDuration = `${lifetime}ms, ${(0.7 + Math.random() * 0.8)}s`;
        p.style.animationDelay = `0s, -${(Math.random() * 0.5).toFixed(2)}s`;

        shrine.appendChild(p);

        setTimeout(() => {
            if (p.parentNode) p.remove();
        }, lifetime);
    }

    const githubStats = document.getElementById('github-stats');

    function positiongithubStats(link) {
        const linkRect = link.getBoundingClientRect();
        const githubStatsRect = githubStats.getBoundingClientRect();
        let x = linkRect.left + linkRect.width / 2 - githubStatsRect.width / 2;
        let y = linkRect.bottom + 8;
        if (x < 10) x = 10;
        if (x + githubStatsRect.width > window.innerWidth - 10) x = window.innerWidth - githubStatsRect.width - 10;
        if (y + githubStatsRect.height > window.innerHeight - 10) y = linkRect.top - githubStatsRect.height - 8;
        githubStats.style.left = `${x}px`;
        githubStats.style.top = `${y}px`;
    }

    const links = document.querySelectorAll('.twitter-link, .github-link, .notes-link');

    if (isTouch) {
        links.forEach(link => { link.style.cursor = 'default'; });
    } else {
        links.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                if (!link.classList.contains('github-link')) return;
                const ellipsisMenu = document.getElementById('ellipsis-menu');
                if (ellipsisMenu) { ellipsisMenu.classList.remove('open'); ellipsisMenu.classList.add('close'); }

                githubStats.style.display = 'flex';
                githubStats.classList.remove('close');
                githubStats.classList.add('open');
                void githubStats.offsetWidth;

                positiongithubStats(link);
            });

            link.addEventListener('mouseleave', () => {
                githubStats.classList.remove('open');
                githubStats.classList.add('close');
            });
        });
    }

    initGithubgithubStats();
    
    (function() {
        const handleClickSound = (e) => {
            const notesContainer = document.getElementById('notes-modal');
            const shrineContainer = document.getElementById('shrine');
            const targetInNotes = notesContainer && notesContainer.contains(e.target);
            const targetInShrine = shrineContainer && shrineContainer.contains(e.target);
        if (!isTouch && !targetInNotes && !targetInShrine) {
            playBasicSound();
        }
        };
        window.addEventListener('click', handleClickSound);

        if (isTouch) return;

        const canvas = document.getElementById('click-spark-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const sparks = [];
        const sparkSize = 6;
        const sparkRadius = 12;
        const sparkCount = 6;
        const duration = 300;
        const sparkOpacity = 0.5;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        const easeOut = (t) => t * (2 - t);

        let animationId;
        const draw = (timestamp) => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            ctx.globalAlpha = sparkOpacity;
            for (let i = sparks.length - 1; i >= 0; i--) {
                const spark = sparks[i];
                const elapsed = timestamp - spark.startTime;
                if (elapsed >= duration) {
                    sparks.splice(i, 1);
                    continue;
                }
                const progress = elapsed / duration;
                const eased = easeOut(progress);
                const distance = eased * sparkRadius;
                const lineLength = sparkSize * (1 - eased);
                const x1 = spark.x + distance * Math.cos(spark.angle);
                const y1 = spark.y + distance * Math.sin(spark.angle);
                const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
                const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);
                const style = getComputedStyle(document.documentElement);
                ctx.strokeStyle = style.getPropertyValue('--gray').trim() || 'var(--color)';
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            if (sparks.length > 0) {
                animationId = requestAnimationFrame(draw);
            }
        };

        const handleClickSpark = (e) => {
            const notesContainer = document.getElementById('notes-modal');
            const shrineContainer = document.getElementById('shrine');
            const targetInNotes = notesContainer && notesContainer.contains(e.target);
            const targetInShrine = shrineContainer && shrineContainer.contains(e.target);
            if (targetInNotes || targetInShrine) return;

            const now = performance.now();
            for (let i = 0; i < sparkCount; i++) {
                sparks.push({
                    x: e.clientX,
                    y: e.clientY,
                    angle: (2 * Math.PI * i) / sparkCount,
                    startTime: now
                });
            }
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            animationId = requestAnimationFrame(draw);
        };
        window.addEventListener('click', handleClickSpark);
    })();

});

async function initGithubgithubStats() {
    const grid = document.getElementById('github-mini-grid');
    if (!grid) return;

    try {
        const response = await fetch('https://github-contributions-api.deno.dev/asahisuenaga.json');
        if (!response.ok) throw new Error('Fetch failed');

        const data = await response.json();
        const allContributions = data.contributions.flat();

        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localToday = new Date(today.getTime() - offset).toISOString().split('T')[0];

        let todayIndex = allContributions.findIndex(day => day.date === localToday);

        const end = todayIndex !== -1 ? todayIndex + 1 : allContributions.length;
        const last20 = allContributions.slice(Math.max(0, end - 20), end);

        grid.innerHTML = '';
        last20.forEach(day => {
            const tile = document.createElement('div');
            tile.className = 'github-tile';
            tile.style.backgroundColor = day.color;
            grid.appendChild(tile);
        });
    } catch (e) {
        console.error('GitHub chart error:', e);
        grid.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const tile = document.createElement('div');
            tile.className = 'github-tile';
            tile.style.backgroundColor = 'var(--gray)';
            grid.appendChild(tile);
        }
    }
}

let lastSoundPlayedAt = 0;
const audioPool = {};

function playSound(file) {
    const now = Date.now();
    if (now - lastSoundPlayedAt < 150) return;
    lastSoundPlayedAt = now;

    if (!audioPool[file]) {
        audioPool[file] = new Audio(file);
    } else {
        audioPool[file].currentTime = 0;
    }
    audioPool[file].play().catch(() => { /* autoplay blocked */ });
}

function playNotesSound() {
    playSound('assets/sounds/notes.wav');
}

function playBasicSound() {
    playSound('assets/sounds/basic.wav');
}

document.addEventListener('pointerup', (e) => {
    const target = e.target.closest('a, button, [role="button"]');
    if (target) {
        if (target.closest('.notes-modal') || target.closest('.mac-stoplights')) {
            playNotesSound();
        } else {
            playBasicSound();
        }
    }
}, true);