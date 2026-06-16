document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('.main-content');

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

            // Action button text
            const actionNotes = document.getElementById('action-notes');
            if (actionNotes) actionNotes.innerText = d.actions.notes;
            const actionTwitter = document.getElementById('action-twitter');
            if (actionTwitter) actionTwitter.innerText = d.actions.twitter;
            const actionGithub = document.getElementById('action-github');
            if (actionGithub) actionGithub.innerText = d.actions.github;

            // Aria-labels, alts, and titles
            const twitterLink = document.querySelector('.twitter-link');
            if (twitterLink) twitterLink.setAttribute('aria-label', d.actions.twitter);
            const githubLink = document.querySelector('.github-link');
            if (githubLink) githubLink.setAttribute('aria-label', d.actions.github);
            const shrineImg = document.querySelector('#shrine .icon');
            if (shrineImg) shrineImg.setAttribute('alt', d.site.shrineAlt);

            // Menu labels
            const menuTranslate = document.getElementById('menu-translate-label');
            if (menuTranslate) menuTranslate.innerText = d.menu.translate;
            const menuDarkmode = document.getElementById('menu-darkmode-label');
            if (menuDarkmode) menuDarkmode.innerText = d.menu.darkmode;

            currentLang = lang;
            const badge = document.getElementById('menu-translate-badge');
            if (badge) badge.innerText = lang === 'ja' ? '字' : 'A';
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

    // Ellipsis menu — open on hover (desktop) or click (any)
    let menuTimer;
    const ellipsisBtn = document.getElementById('ellipsis-btn');
    const ellipsisMenu = document.getElementById('ellipsis-menu');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function closeMenu() {
        if (ellipsisMenu) {
            ellipsisMenu.classList.remove('open');
            ellipsisMenu.classList.add('close');
        }
    }

    function openMenu() {
        // Hide all tooltips when menu opens
        const tooltip = document.getElementById('tooltip');
        if (tooltip) { tooltip.classList.remove('open'); tooltip.classList.add('close'); }
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
        const firstBtn = ellipsisMenu.querySelector('button');
        if (firstBtn) firstBtn.focus();
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

    ellipsisBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(menuTimer);
        if (ellipsisMenu?.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    ellipsisBtn?.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
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
        playClickSound();
        document.getElementById('ellipsis-menu')?.classList.remove('open');
    });

    const isDarkEffective = () => document.body.classList.contains('dark-mode') || (window.matchMedia('(prefers-color-scheme: dark)').matches && !document.body.classList.contains('light-mode'));

    document.getElementById('menu-darkmode')?.addEventListener('click', () => {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (document.body.classList.contains('dark-mode') || document.body.classList.contains('light-mode')) {
            document.body.classList.remove('dark-mode', 'light-mode');
        } else {
            document.body.classList.add(systemDark ? 'light-mode' : 'dark-mode');
        }
        document.getElementById('menu-darkmode-badge').innerText = isDarkEffective() ? '✓' : '';
        playClickSound();
        setTimeout(closeMenu, 400);
    });

    // Re-check badge on system color scheme change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!document.body.classList.contains('dark-mode') && !document.body.classList.contains('light-mode')) {
            document.getElementById('menu-darkmode-badge').innerText = window.matchMedia('(prefers-color-scheme: dark)').matches ? '✓' : '';
        }
    });

    // Initialize menu badges
    document.getElementById('menu-translate-badge').innerText = currentLang === 'ja' ? 'JA' : 'EN';
    document.getElementById('menu-darkmode-badge').innerText = isDarkEffective() ? '✓' : '';

});

document.addEventListener('DOMContentLoaded', () => {
    const shrine = document.getElementById('shrine');
    let hoverInterval;

    if (!shrine) return;

    shrine.addEventListener('pointerenter', () => {
        hoverInterval = setInterval(() => {
            if (!shrine.classList.contains('holding') || Math.random() < 0.2) {
                createFirefly(shrine.classList.contains('holding') ? 0.8 : 1);
            }
        }, 350);

        for (let i = 0; i < 6; i++) {
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

        // Sound is handled by global listener as shrine is role="button"

        for (let i = 0; i < 8; i++) {
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
        
        // Always generate the warm yellow/orange color
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
});

async function initGithubTooltip() {
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
            tile.style.backgroundColor = 'var(--subtitle)';
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
    audioPool[file].play().catch(() => { });
}

function playNotesClickSound() {
    playSound('/sounds/notes.wav');
}

function playNotesDeleteSound() {
    playSound('/sounds/delete.wav');
}

function playMoveSound() {
    // Use a move-specific sound file; fallback to notes on error is handled by browser
    playSound('/sounds/move.wav');
}

function playClickSound() {
    playSound('/sounds/basic.wav');
}

document.addEventListener('pointerup', (e) => {
    const target = e.target.closest('a, button, [role="button"]');
    if (target) {
        // Determine which sound to play
        if (target.closest('.notes-modal') || target.closest('.mac-stoplights')) {
            playNotesClickSound();
        } else {
            playClickSound();
        }
    }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const tooltip = document.getElementById('tooltip');

    function positionTooltip(link) {
        const linkRect = link.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        let x = linkRect.left + linkRect.width / 2 - tooltipRect.width / 2;
        let y = linkRect.bottom + 8;
        if (x < 10) x = 10;
        if (x + tooltipRect.width > window.innerWidth - 10) x = window.innerWidth - tooltipRect.width - 10;
        if (y + tooltipRect.height > window.innerHeight - 10) y = linkRect.top - tooltipRect.height - 8;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    const links = document.querySelectorAll('.twitter-link, .github-link, .notes-link');

    if (isTouchDevice) {
        links.forEach(link => { link.style.cursor = 'default'; });
    } else {
        links.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                if (!link.classList.contains('github-link')) return;
                // Close ellipsis menu if open
                const ellipsisMenu = document.getElementById('ellipsis-menu');
                if (ellipsisMenu) { ellipsisMenu.classList.remove('open'); ellipsisMenu.classList.add('close'); }

                tooltip.style.display = 'flex';
                tooltip.classList.remove('close');
                tooltip.classList.add('open');
                void tooltip.offsetWidth;

                positionTooltip(link);
            });

            link.addEventListener('mouseleave', () => {
                tooltip.classList.remove('open');
                tooltip.classList.add('close');
            });
        });
    }

    initGithubTooltip();
});

document.addEventListener('DOMContentLoaded', async () => {
    // ClickSpark Effect
    (function() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Sound click handler — always registered on all devices
        const handleClickSound = (e) => {
            const notesContainer = document.getElementById('notes-modal');
            const shrineContainer = document.getElementById('shrine');
            const targetInNotes = notesContainer && notesContainer.contains(e.target);
            const targetInShrine = shrineContainer && shrineContainer.contains(e.target);
        if (!isTouchDevice && !targetInNotes && !targetInShrine) {
            playSound('/sounds/basic.wav');
        }
        };
        window.addEventListener('click', handleClickSound);

        // Spark animation — only on non-touch devices
        if (isTouchDevice) return;

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
                ctx.strokeStyle = style.getPropertyValue('--subtitle').trim() || '#000';
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

    const bookmark = document.getElementById('notes-btn');
    const notesModal = document.getElementById('notes-modal');
    const notesBackdrop = document.getElementById('notes-backdrop');

    const panels = {
        folders: document.getElementById('panel-folders'),
        notes: document.getElementById('panel-notes'),
        view: document.getElementById('panel-note-view')
    };

    const CUSTOM_FOLDER_KEY = 'apple_notes_custom_folders';
    let customFolders = JSON.parse(localStorage.getItem(CUSTOM_FOLDER_KEY) || '[]');

    const folderMap = {
        'panel-notes-all': 'all',
        'panel-notes-personal': 'Personal',
        'panel-notes-projects': 'Projects',
        'panel-notes-deleted': 'recently_deleted'
    };

    let currentFolder = 'all';

    const folderGroup = document.querySelector('.notes-list-group');
    let lastSelectedIndex = null;

    let seedNoteIds = new Set();
    const isBuiltInNoteId = (id) => seedNoteIds.has(id);

    const getNotesLocale = () => document.documentElement.lang === 'ja' ? 'ja' : 'en';
    const folderDisplayName = (name) => {
        const lang = getNotesLocale();
        const map = (window.translations || {})[lang]?.notes?.folderDisplayNames;
        if (map && map[name]) return map[name];
        return name;
    };

    const resolveTemplate = (template, ...args) => {
        let result = template;
        if (template.includes('{n}')) result = result.replace('{n}', args[0]);
        if (template.includes('{folder}')) {
            const folderArg = template.includes('{n}') ? args[1] : args[0];
            result = result.replace('{folder}', folderDisplayName(folderArg));
        }
        if (template.includes('{name}')) result = result.replace('{name}', args[0]);
        return result;
    };

    const tcm = (key, ...args) => {
        const lang = getNotesLocale();
        const wt = window.translations || {};
        const template = wt[lang]?.notes?.contextMenu?.[key]
            ?? wt.en?.notes?.contextMenu?.[key];
        if (!template) return key;
        if (template.includes('{')) return resolveTemplate(template, ...args);
        return template;
    };

    window.applyNotesLang = (lang) => {
        const n = (window.translations || {})[lang]?.notes;
        if (!n) return;

        // Folders panel title
        const foldersTitle = document.querySelector('#panel-folders .notes-large-title');
        if (foldersTitle) foldersTitle.innerText = n.folders.title;

        // Folder names (update text node after img)
        const folderMap = {
            'panel-notes-all': n.folders.all,
            'panel-notes-personal': n.folders.personal,
            'panel-notes-projects': n.folders.projects,
            'panel-notes-deleted': n.folders.deleted
        };
        Object.entries(folderMap).forEach(([target, label]) => {
            const el = document.querySelector(`#panel-folders [data-target="${target}"] .notes-folder-info`);
            if (!el) return;
            const img = el.querySelector('img');
            el.innerHTML = '';
            if (img) el.appendChild(img);
            el.append(label);
        });

        // New Folder button
        const newFolderBtn = document.getElementById('new-folder-btn-top');
        if (newFolderBtn) newFolderBtn.title = n.buttons.newFolder;
        const newFolderFooter = document.getElementById('new-folder-btn');
        if (newFolderFooter) newFolderFooter.title = n.buttons.newFolder;

        // Sidebar button
        const sidebarBtn = document.getElementById('sidebar-toggle');
        if (sidebarBtn) sidebarBtn.title = n.buttons.sidebar;

        // New Note button
        const newNoteBtn = document.getElementById('new-note-btn-header');
        if (newNoteBtn) newNoteBtn.title = n.buttons.newNote;
        const newNoteBtnMobile = document.getElementById('new-note-btn-mobile');
        if (newNoteBtnMobile) newNoteBtnMobile.title = n.buttons.newNote;

        // Minimized label
        const notesModal = document.querySelector('.notes-modal');
        if (notesModal) notesModal.style.setProperty('--notes-minimized-label', n.modal.minimizedLabel);

        // Window controls (stoplights)
        document.querySelectorAll('.mac-close').forEach(el => el.setAttribute('aria-label', n.modal.close));
        document.querySelectorAll('.mac-min').forEach(el => el.setAttribute('aria-label', n.modal.minimize));
        document.querySelectorAll('.mac-max').forEach(el => el.setAttribute('aria-label', n.modal.maximize));

        // Back buttons
        document.querySelectorAll('.notes-back').forEach(el => el.setAttribute('aria-label', n.modal.back));

        // New Folder button aria-label
        const newFolderTop = document.getElementById('new-folder-btn-top');
        if (newFolderTop) newFolderTop.setAttribute('aria-label', n.buttons.newFolder);
        const newFolderFooter2 = document.getElementById('new-folder-btn');
        if (newFolderFooter2) newFolderFooter2.setAttribute('aria-label', n.buttons.newFolder);

        // Sidebar aria-label
        if (sidebarBtn) sidebarBtn.setAttribute('aria-label', n.buttons.sidebar);

        // New Note aria-label
        if (newNoteBtn) newNoteBtn.setAttribute('aria-label', n.buttons.newNote);
        if (newNoteBtnMobile) newNoteBtnMobile.setAttribute('aria-label', n.buttons.newNote);

        // Toolbar button titles
        const toolbarTitles = {
            bold: n.toolbar.bold, italic: n.toolbar.italic, underline: n.toolbar.underline,
            strikeThrough: n.toolbar.strikeThrough, outdent: n.toolbar.outdent, indent: n.toolbar.indent,
            insertUnorderedList: n.toolbar.insertUnorderedList, insertOrderedList: n.toolbar.insertOrderedList
        };
        document.querySelectorAll('.notes-toolbar-btn[data-command]').forEach(btn => {
            const cmd = btn.getAttribute('data-command');
            if (toolbarTitles[cmd]) btn.title = toolbarTitles[cmd];
            const img = btn.querySelector('img');
            if (img && toolbarTitles[cmd]) img.alt = toolbarTitles[cmd];
        });
        const monoBtn = document.getElementById('notes-mono-btn');
        if (monoBtn) monoBtn.title = n.toolbar.mono;
        if (monoBtn) monoBtn.setAttribute('aria-label', n.toolbar.mono);
        const dashBtn = document.getElementById('notes-dash-btn');
        if (dashBtn) dashBtn.title = n.toolbar.dash;
        const dashImg = dashBtn?.querySelector('img');
        if (dashImg) dashImg.alt = n.toolbar.dash;
        const checklistBtn = document.getElementById('notes-checklist-btn');
        if (checklistBtn) checklistBtn.title = n.toolbar.checklist;
        const checklistImg = checklistBtn?.querySelector('img');
        if (checklistImg) checklistImg.alt = n.toolbar.checklist;

        // Re-render the current notes list
        renderNotesList(currentFolder, false);
    };

    let openFolderContextMenu = () => { };
    let bindFolderClicks = () => { };

    const setNoteViewReadOnly = (readonly) => {
        const titleEd = document.getElementById('active-note-title');
        const contentEd = document.getElementById('active-note-content');
        const toolbar = document.querySelector('#panel-note-view .notes-header-right');
        const panel = document.getElementById('panel-note-view');
        if (!titleEd || !contentEd) return;
        titleEd.contentEditable = readonly ? 'false' : 'true';
        contentEd.contentEditable = readonly ? 'false' : 'true';
        panel?.classList.toggle('note-view-readonly', readonly);
        if (toolbar) {
            toolbar.style.opacity = readonly ? '0.35' : '';
            toolbar.style.pointerEvents = readonly ? 'none' : '';
        }
    };

    const slugify = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    const constrainMenuToViewport = (menu, x, y) => {
        // Position menu
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        // Get menu dimensions after positioning
        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            const padding = 10;
            let newX = x;
            let newY = y;

            // Adjust horizontal position if menu goes off-screen
            if (rect.right > window.innerWidth - padding) {
                newX = window.innerWidth - rect.width - padding;
            }
            if (rect.left < padding) {
                newX = padding;
            }

            // Adjust vertical position if menu goes off-screen
            if (rect.bottom > window.innerHeight - padding) {
                newY = window.innerHeight - rect.height - padding;
            }
            if (rect.top < padding) {
                newY = padding;
            }

            menu.style.left = Math.max(padding, newX) + 'px';
            menu.style.top = Math.max(padding, newY) + 'px';
        }, 0);
    };

    const getMoveTargets = () => {
        return Array.from(new Set(Object.values(folderMap))).filter(f => f && f !== 'recently_deleted' && f !== 'all');
    };

    const renderFolderList = () => {
        if (!folderGroup) return;

        // Remove custom items first
        folderGroup.querySelectorAll('.folder-list-item.custom').forEach(el => el.remove());

        const divider = folderGroup.querySelector('div[style*="height: 1px"]');

        customFolders.forEach(folderName => {
            const folderKey = `panel-notes-${slugify(folderName)}`;
            folderMap[folderKey] = folderName;

            const item = document.createElement('div');
            item.className = 'notes-list-item folder-list-item custom';
            item.setAttribute('data-target', folderKey);
            item.dataset.customFolder = 'true';
            item.style.userSelect = 'none';

            const info = document.createElement('div');
            info.className = 'notes-folder-info';
            info.innerHTML = `<img alt="Folder" src="icons/folder.svg" style="width:18px; height:18px; display:inline-block; vertical-align:-3px;" draggable="false">${folderName}`;

            const count = document.createElement('div');
            count.innerHTML = `<span class="notes-count" id="count-${folderKey}">0</span>`;

            item.appendChild(info);
            item.appendChild(count);

            if (divider) folderGroup.insertBefore(item, divider);
            else folderGroup.appendChild(item);
        });

        updateCounts();
        bindFolderClicks();
    };

    const createFolder = () => {
        const folderName = prompt(tcm('promptNewFolderName'));
        if (!folderName) return;
        if (['All Notes', 'Personal', 'Projects', 'Recently Deleted'].includes(folderName)) {
            alert(tcm('reservedFolder'));
            return;
        }
        if (customFolders.includes(folderName)) {
            alert(tcm('folderExists'));
            return;
        }
        customFolders.push(folderName);
        localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
        renderFolderList();
        playNotesClickSound();
    };

    const navigateTo = (targetId, opts = {}) => {
        Object.values(panels).forEach(p => {
            p.classList.remove('active', 'prev');
        });

        if (targetId === 'folders') {
            panels.folders.classList.add('active');
        } else if (targetId === 'notes' || folderMap[targetId]) {
            const filter = folderMap[targetId] || currentFolder || 'all';
            currentFolder = filter;
            if (!opts.skipListRender) {
                renderNotesList(filter);
            }
            panels.folders.classList.add('prev');
            panels.notes.classList.add('active');
        } else if (targetId === 'view') {
            if (window.innerWidth < 800) {
                panels.notes.classList.add('prev');
            }
            panels.view.classList.add('active');
        }
    };

    const parseNoteMd = (raw) => {
        const match = raw.trim().match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (!match) return null;
        const meta = {};
        match[1].split(/\r?\n/).forEach((line) => {
            const idx = line.indexOf(':');
            if (idx === -1) return;
            const k = line.slice(0, idx).trim();
            let v = line.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1);
            }
            meta[k] = v;
        });
        return { meta, content: match[2].trim() };
    };

    const hydrateNotes = async () => {
        const noteFiles = ['about-me', "rainbow-cursor"];
        const out = {};
        await Promise.all(noteFiles.map(async (id) => {
            const res = await fetch(`/notes/${id}.md`);
            if (!res.ok) return;
            const parsed = parseNoteMd(await res.text());
            if (!parsed) return;
            const m = parsed.meta;
            out[id] = {
                title: m.title || '',
                folder: m.folder || 'all',
                lastEdited: m.date ? new Date(m.date).getTime() : Date.now(),
                content: parsed.content || '',
                permalink: m.permalink || '',
                pinned: m.pinned === true || m.pinned === 'true' || m.pinned === '1'
            };
        }));
        return out;
    };

    let notesReady = false;
    let notesData = await hydrateNotes();
    seedNoteIds = new Set(Object.keys(notesData));
    const savedNotes = localStorage.getItem('apple_notes_data');
    if (savedNotes) {
        const userNotes = JSON.parse(savedNotes);
        for (const [id, note] of Object.entries(userNotes)) {
            if (!seedNoteIds.has(id)) notesData[id] = note;
        }
    }
    notesReady = true;

    const updateCounts = () => {
        const counts = { all: 0, Personal: 0, Projects: 0, recently_deleted: 0 };
        Object.values(notesData).forEach(note => {
            if (note.folder === 'recently_deleted') {
                counts.recently_deleted++;
            } else {
                counts.all++;
                if (note.folder && note.folder !== 'all' && note.folder !== 'recently_deleted') {
                    if (counts[note.folder] !== undefined) counts[note.folder]++;
                    else counts[note.folder] = (counts[note.folder] || 0) + 1;
                }
            }
        });
        if (document.getElementById('count-all')) document.getElementById('count-all').innerText = counts.all;
        if (document.getElementById('count-personal')) document.getElementById('count-personal').innerText = counts.Personal;
        if (document.getElementById('count-projects')) document.getElementById('count-projects').innerText = counts.Projects;
        if (document.getElementById('count-deleted')) document.getElementById('count-deleted').innerText = counts.recently_deleted;

        customFolders.forEach(folderName => {
            const folderKey = `panel-notes-${slugify(folderName)}`;
            const countEl = document.getElementById(`count-${folderKey}`);
            if (countEl) countEl.innerText = counts[folderName] || 0;
        });
    };

    const saveNotes = () => {
        const userNotes = {};
        for (const [id, note] of Object.entries(notesData)) {
            if (!seedNoteIds.has(id)) {
                userNotes[id] = {
                    title: note.title,
                    folder: note.folder,
                    lastEdited: note.lastEdited,
                    content: note.content,
                    permalink: note.permalink,
                    pinned: note.pinned
                };
            }
        }
        localStorage.setItem('apple_notes_data', JSON.stringify(userNotes));
        updateCounts();
    };

    const formatNoteDate = (timestamp) => {
        const lang = getNotesLocale();
        const locale = lang === 'ja' ? 'ja' : 'en-US';
        const dt = (window.translations || {})[lang]?.notes?.dateTime || {};
        const now = new Date();
        const d = new Date(timestamp);
        const isToday = now.toDateString() === d.toDateString();
        if (isToday) return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hourCycle: lang === 'ja' ? 'h23' : 'h12' });

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (yesterday.toDateString() === d.toDateString()) return dt.yesterday || 'Yesterday';

        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: 'long' });

        return d.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    const formatFullNoteDate = (timestamp) => {
        const lang = getNotesLocale();
        const locale = lang === 'ja' ? 'ja' : 'en-US';
        const dt = (window.translations || {})[lang]?.notes?.dateTime || {};
        const d = new Date(timestamp);
        const dateStr = d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hourCycle: lang === 'ja' ? 'h23' : 'h12' });
        const at = dt.at || 'at';
        return at ? `${dateStr} ${at} ${timeStr}` : `${dateStr} ${timeStr}`;
    };

    function renderNotesList(folderFilter, autoSelect = true) {
        if (!notesReady) return;
        const listContainer = document.getElementById('notes-list-container');
        if (!listContainer) return;

        const prevSelection = document.querySelector('.note-preview.selected')?.getAttribute('data-note-id');
        let selectionTarget = null;
        listContainer.innerHTML = '';

        // Recently Deleted Notice
        if (folderFilter === 'recently_deleted') {
            const notice = document.createElement('div');
            notice.className = 'notes-delete-notice';
            notice.innerText = getNotesLocale() === 'ja' ? '削除されたノートは三時間後に完全に削除されます。' : 'Deleted notes are permanently removed after 3 hours.';
            listContainer.appendChild(notice);
        }
        let filteredNotes = Object.keys(notesData).filter(key => {
            const note = notesData[key];
            if (folderFilter === 'all') return note.folder !== 'recently_deleted';
            return note.folder === folderFilter;
        });

        // Sort notes: Pinned first, then by lastEdited
        filteredNotes.sort((a, b) => {
            if (notesData[a].pinned && !notesData[b].pinned) return -1;
            if (!notesData[a].pinned && notesData[b].pinned) return 1;
            return notesData[b].lastEdited - notesData[a].lastEdited;
        });

        if (prevSelection && filteredNotes.includes(prevSelection)) {
            selectionTarget = prevSelection;
        } else if (autoSelect && filteredNotes.length) {
            selectionTarget = filteredNotes[0];
        }

        let hasPinnedHeader = false;
        let hasNotesHeader = false;

        const titleNode = document.getElementById('notes-header-title');
        if (titleNode) {
            if (folderFilter === 'recently_deleted') {
                titleNode.innerText = getNotesLocale() === 'ja' ? '削除済み' : 'Recently Deleted';
            } else if (folderFilter === 'all') {
                titleNode.innerText = getNotesLocale() === 'ja' ? 'すべてのノート' : 'All Notes';
            } else if (folderFilter === 'Personal') {
                titleNode.innerText = getNotesLocale() === 'ja' ? '個人' : 'Personal';
            } else if (folderFilter === 'Projects') {
                titleNode.innerText = getNotesLocale() === 'ja' ? 'コーディング' : 'Projects';
            } else {
                titleNode.innerText = folderFilter;
            }
        }

        filteredNotes.forEach(noteId => {
            const data = notesData[noteId];

            if (data.pinned && !hasPinnedHeader) {
                const h = document.createElement('div');
                h.innerText = getNotesLocale() === 'ja' ? 'ピン留め済み' : 'Pinned';
                h.style.cssText = 'font-size: 0.875rem; user-select: none; font-weight: 500; color: #8e8e93; padding: 12px 16px 4px;';
                listContainer.appendChild(h);
                hasPinnedHeader = true;
            } else if (!data.pinned && hasPinnedHeader && !hasNotesHeader && folderFilter !== 'recently_deleted') {
                const h = document.createElement('div');
                h.innerText = getNotesLocale() === 'ja' ? 'ノート' : 'Notes';
                h.style.cssText = 'font-size: 0.875rem; user-select: none; font-weight: 500; color: #8e8e93; padding: 12px 16px 4px;';
                listContainer.appendChild(h);
                hasNotesHeader = true;
            }

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.content;
            const firstChild = tempDiv.querySelector('li, p, div, blockquote, h1, h2, h3, h4, h5, h6');
            const previewText = (firstChild || tempDiv).textContent || (firstChild || tempDiv).innerText || '';

            const el = document.createElement('div');
            el.className = 'notes-list-item note-preview';
            el.setAttribute('data-note-id', noteId);
            if (data.pinned) el.classList.add('note-pinned');
            const listDateDisplay = formatNoteDate(data.lastEdited);
            el.innerHTML = `
                <div class="note-preview-title">${data.title}</div>
                <div class="note-preview-date-row">
                    <span class="notes-date-inline">${listDateDisplay}</span>
                    <span class="note-preview-desc">${previewText.substring(0, 120)}</span>
                </div>
            `;

            el.addEventListener('click', (e) => {
                if (isLongPress) {
                    isLongPress = false;
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const notes = Array.from(listContainer.querySelectorAll('.note-preview'));
                const currentIndex = notes.indexOf(el);

                if (e.shiftKey && lastSelectedIndex !== null) {
                    const start = Math.min(lastSelectedIndex, currentIndex);
                    const end = Math.max(lastSelectedIndex, currentIndex);
                    notes.forEach((n, idx) => {
                        if (idx >= start && idx <= end) {
                            n.classList.add('selected');
                        }
                    });
                    lastSelectedIndex = currentIndex;
                    return;
                }

                const isMulti = e.metaKey || e.ctrlKey;
                if (isMulti) {
                    el.classList.toggle('selected');
                    lastSelectedIndex = currentIndex;
                    return;
                }

                document.querySelectorAll('.note-preview').forEach(n => {
                    n.classList.remove('selected');
                });
                el.classList.add('selected');

                document.getElementById('active-note-content').setAttribute('data-current-note', noteId);
                document.getElementById('active-note-content').innerHTML = data.content;
                document.getElementById('active-note-title').innerText = data.title;
                document.getElementById('active-note-date').innerText =formatFullNoteDate(data.lastEdited);
                setNoteViewReadOnly(isBuiltInNoteId(noteId) || data.folder === 'recently_deleted');
                if (data.permalink) {
                    history.pushState(null, '', data.permalink);
                }
                navigateTo('view');
                playNotesClickSound();

                lastSelectedIndex = currentIndex;
            });

            // Deletion Logic (Long Press & Right Click)
            let pressTimer;
            let isLongPress = false;
            const clearTimer = () => {
                clearTimeout(pressTimer);
            };

            const handleNoteAction = (e) => {
                if (e.type === 'pointerdown') {
                    if (!pressTimer) return;
                }

                isLongPress = true;
                e.preventDefault();
                e.stopPropagation();

                const existingMenu = document.getElementById('note-context-menu');
                if (existingMenu) existingMenu.remove();

                const menu = document.createElement('div');
                menu.id = 'note-context-menu';
                menu.className = 'note-context-menu';

                // Handle coordinates for both Mouse and Pointer events
                const x = (e.clientX || (e.touches ? e.touches[0].clientX : 0)) - 10;
                const y = (e.clientY || (e.touches ? e.touches[0].clientY : 0)) - 10;

                document.body.appendChild(menu);
                constrainMenuToViewport(menu, x, y);

                const isDeleted = data.folder === 'recently_deleted';

                if (isDeleted) {
                    const restoreBtn = document.createElement('div');
                    restoreBtn.className = 'note-context-item';
                    restoreBtn.innerText = tcm('recoverNote');
                    restoreBtn.onclick = () => {
                        data.folder = data.originalFolder || 'Notes';
                        delete data.deletedAt;
                        delete data.originalFolder;
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                        playNotesClickSound();
                    };
                    menu.appendChild(restoreBtn);

                    const delBtn = document.createElement('div');
                    delBtn.className = 'note-context-item';
                    delBtn.style.color = '#FF453A';
                    delBtn.innerText = tcm('deletePermanently');
                    delBtn.onclick = () => {
                        delete notesData[noteId];
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                        playNotesDeleteSound();
                    };
                    menu.appendChild(delBtn);
                } else {
                    // Pin / Unpin Note
                    const pinBtn = document.createElement('div');
                    pinBtn.className = 'note-context-item';
                    pinBtn.innerText = data.pinned ? tcm('unpinNote') : tcm('pinNote');
                    pinBtn.onclick = () => {
                        data.pinned = !data.pinned;
                        if (!isBuiltInNoteId(noteId)) {
                            saveNotes();
                        }
                        renderNotesList(folderFilter);
                        menu.remove();
                        playNotesClickSound();
                    };
                    menu.appendChild(pinBtn);

                    if (!isBuiltInNoteId(noteId)) {
                        const separator1 = document.createElement('div');
                        separator1.style.height = '1px';
                        separator1.style.background = 'rgba(0,0,0,0.1)';
                        separator1.style.margin = '4px 0';
                        separator1.className = 'context-separator';
                        menu.appendChild(separator1);

                        // Move to Folder (all available, includes custom)
                        getMoveTargets().forEach(f => {
                            if (data.folder === f) return;
                            const moveBtn = document.createElement('div');
                            moveBtn.className = 'note-context-item';
                            moveBtn.innerText = tcm('moveTo', f);
                            moveBtn.onclick = () => {
                                data.folder = f === 'all' ? 'all' : f;
                                saveNotes();
                                renderNotesList(folderFilter);
                                menu.remove();
                                playMoveSound();
                            };
                            menu.appendChild(moveBtn);
                        });

                        const separator = document.createElement('div');
                        separator.style.height = '1px';
                        separator.style.background = 'rgba(0,0,0,0.1)';
                        separator.style.margin = '4px 0';
                        separator.className = 'context-separator';
                        menu.appendChild(separator);

                        const actionBtn = document.createElement('div');
                        actionBtn.className = 'note-context-item';
                        actionBtn.style.color = '#FF453A';
                        actionBtn.innerText = tcm('deleteNote');
                        actionBtn.onclick = () => {
                            data.originalFolder = data.folder;
                            data.folder = 'recently_deleted';
                            data.deletedAt = Date.now();
                            data.pinned = false;
                            saveNotes();
                            renderNotesList(folderFilter);
                            menu.remove();
                            playNotesDeleteSound();
                        };
                        menu.appendChild(actionBtn);
                    }
                }

                const closeMenu = (ev) => {
                    if (!menu.contains(ev.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeMenu), 10);
            };

            const handleMultiNoteAction = (e) => {
                const selectedEls = document.querySelectorAll('.note-preview.selected');
                const selectedIds = Array.from(selectedEls).map(el => el.getAttribute('data-note-id'));

                if (selectedIds.length <= 1) return handleNoteAction(e);

                e.preventDefault();
                e.stopPropagation();

                const existingMenu = document.getElementById('note-context-menu');
                if (existingMenu) existingMenu.remove();

                const menu = document.createElement('div');
                menu.id = 'note-context-menu';
                menu.className = 'note-context-menu';
                const x = (e.clientX || 0) - 10;
                const y = (e.clientY || 0) - 10;

                const multiHasBuiltIn = selectedIds.some((id) => isBuiltInNoteId(id));
                const isInDeletedFolder = folderFilter === 'recently_deleted';

                if (isInDeletedFolder) {
                    // Recover N Notes
                    const recoverBtn = document.createElement('div');
                    recoverBtn.className = 'note-context-item';
                    recoverBtn.innerText = tcm('recoverN', selectedIds.length);
                    recoverBtn.onclick = () => {
                        selectedIds.forEach(id => {
                            notesData[id].folder = notesData[id].originalFolder || 'Notes';
                            delete notesData[id].deletedAt;
                            delete notesData[id].originalFolder;
                        });
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                        playNotesClickSound();
                    };
                    menu.appendChild(recoverBtn);

                    // Delete N Notes Permanently
                    const permDelBtn = document.createElement('div');
                    permDelBtn.className = 'note-context-item';
                    permDelBtn.style.color = '#FF453A';
                    permDelBtn.innerText = tcm('deletePermanentlyN', selectedIds.length);
                    permDelBtn.onclick = () => {
                        selectedIds.forEach(id => {
                            delete notesData[id];
                        });
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                        playNotesDeleteSound();
                    };
                    menu.appendChild(permDelBtn);
                } else if (!multiHasBuiltIn) {
                    // Pin / Unpin Notes
                    const selectedPinnedCount = selectedIds.filter(id => notesData[id]?.pinned).length;
                    const selectedUnpinnedCount = selectedIds.length - selectedPinnedCount;

                    if (selectedUnpinnedCount > 0) {
                        const pinBtn = document.createElement('div');
                        pinBtn.className = 'note-context-item';
                        pinBtn.innerText = tcm('pinN', selectedUnpinnedCount);
                        pinBtn.onclick = () => {
                            selectedIds.forEach(id => {
                                if (!notesData[id]?.pinned) notesData[id].pinned = true;
                            });
                            saveNotes();
                            renderNotesList(folderFilter);
                            menu.remove();
                            playNotesClickSound();
                        };
                        menu.appendChild(pinBtn);
                    }

                    if (selectedPinnedCount > 0) {
                        const unpinBtn = document.createElement('div');
                        unpinBtn.className = 'note-context-item';
                        unpinBtn.innerText = tcm('unpinN', selectedPinnedCount);
                        unpinBtn.onclick = () => {
                            selectedIds.forEach(id => {
                                if (notesData[id]?.pinned) notesData[id].pinned = false;
                            });
                            saveNotes();
                            renderNotesList(folderFilter);
                            menu.remove();
                            playNotesClickSound();
                        };
                        menu.appendChild(unpinBtn);
                    }
                }

                if (!multiHasBuiltIn && !isInDeletedFolder) {
                    const separator1 = document.createElement('div');
                    separator1.style.height = '1px';
                    separator1.style.background = 'rgba(0,0,0,0.1)';
                    separator1.style.margin = '4px 0';
                    separator1.className = 'context-separator';
                    menu.appendChild(separator1);

                    const selectedFolders = Array.from(new Set(selectedIds.map(id => notesData[id].folder)));
                    getMoveTargets().forEach(f => {
                        if (selectedFolders.length === 1 && selectedFolders[0] === f) return;
                        if (selectedFolders.every(sf => sf === f)) return;

                        const mbtn = document.createElement('div');
                        mbtn.className = 'note-context-item';
                        mbtn.innerText = tcm('moveNTo', selectedIds.length, f);
                        mbtn.onclick = () => {
                            selectedIds.forEach(id => {
                                notesData[id].folder = f;
                            });
                            saveNotes();
                            renderNotesList(folderFilter);
                            menu.remove();
                            playMoveSound();
                        };
                        menu.appendChild(mbtn);
                    });

                    const separator2 = document.createElement('div');
                    separator2.style.height = '1px';
                    separator2.style.background = 'rgba(0,0,0,0.1)';
                    separator2.style.margin = '4px 0';
                    separator2.className = 'context-separator';
                    menu.appendChild(separator2);
                }

                if (!multiHasBuiltIn && !isInDeletedFolder) {
                    const delBtn = document.createElement('div');
                    delBtn.className = 'note-context-item';
                    delBtn.style.color = '#FF453A';
                    delBtn.innerText = tcm('deleteN', selectedIds.length);
                    delBtn.onclick = () => {
                        selectedIds.forEach(id => {
                            notesData[id].originalFolder = notesData[id].folder;
                            notesData[id].folder = 'recently_deleted';
                            notesData[id].deletedAt = Date.now();
                            notesData[id].pinned = false;
                        });
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                        playNotesDeleteSound();
                    };
                    menu.appendChild(delBtn);
                }

                document.body.appendChild(menu);
                constrainMenuToViewport(menu, x, y);

                const closeMultiMenu = (ev) => {
                    if (ev.button === 2) return; // ignore right-click
                    if (!menu.contains(ev.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMultiMenu);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeMultiMenu), 10);
            };

            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const selectedEls = document.querySelectorAll('.note-preview.selected');
                if (selectedEls.length > 1) {
                    handleMultiNoteAction(e);
                } else {
                    handleNoteAction(e);
                }
            });
            el.addEventListener('pointerdown', (e) => {
                // Clear existing to avoid double menus
                clearTimer();
                pressTimer = setTimeout(() => {
                    handleNoteAction(e);
                }, 500); // 500ms for long press
            });
            el.addEventListener('pointermove', clearTimer);
            el.addEventListener('pointerup', clearTimer);
            el.addEventListener('pointercancel', clearTimer);
            el.addEventListener('pointerleave', clearTimer);

            if (noteId === selectionTarget) {
                el.classList.add('selected');
                if (autoSelect && selectionTarget) {
                    document.getElementById('active-note-content').setAttribute('data-current-note', noteId);
                    document.getElementById('active-note-content').innerHTML = data.content;
                    document.getElementById('active-note-title').innerText = data.title;
                    document.getElementById('active-note-date').innerText = formatFullNoteDate(data.lastEdited);
                    setNoteViewReadOnly(isBuiltInNoteId(noteId) || data.folder === 'recently_deleted');
                }
            }

            listContainer.appendChild(el);
        });

        // Update counts
        const deletedCount = Object.values(notesData).filter(n => n.folder === 'recently_deleted').length;
        const delCountNode = document.getElementById('deleted-notes-count');
        if (delCountNode) delCountNode.innerText = deletedCount;
    }

    // Edit Event Listeners
    const titleEditor = document.getElementById('active-note-title');
    const contentEditor = document.getElementById('active-note-content');

    const syncCheckboxState = () => {
        const checkboxes = contentEditor.querySelectorAll('.checklist-checkbox');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                cb.setAttribute('checked', '');
            } else {
                cb.removeAttribute('checked');
            }
        });
    };

    if (titleEditor && contentEditor) {
        const handleEdit = () => {
            const noteId = contentEditor.getAttribute('data-current-note');
            if (noteId && isBuiltInNoteId(noteId)) return;
            if (noteId && notesData[noteId]) {
                syncCheckboxState();
                notesData[noteId].title = titleEditor.innerText;
                notesData[noteId].content = contentEditor.innerHTML;
                notesData[noteId].lastEdited = Date.now();
                if (!isBuiltInNoteId(noteId)) {
                    notesData[noteId].permalink = '/notes/' + slugify(titleEditor.innerText);
                    history.replaceState(null, '', notesData[noteId].permalink);
                }
                saveNotes();
                // Update date display in view
                document.getElementById('active-note-date').innerText = formatFullNoteDate(notesData[noteId].lastEdited);
                // Re-render the list to update previews and sorting
                const currentF = document.querySelector('.active-folder')?.getAttribute('data-target');
                const filter = (currentF && Object.prototype.hasOwnProperty.call(folderMap, currentF))
                    ? folderMap[currentF]
                    : currentFolder;
                renderNotesList(filter, false); // false to avoid recursive click
            }
        };

        titleEditor.addEventListener('input', handleEdit);

        // Normalize stray nodes inside checklist items and keep the caret inside the checklist text area
        contentEditor.addEventListener('input', () => {
            const items = contentEditor.querySelectorAll('.checklist-item');
            items.forEach(item => {
                const contentDiv = item.querySelector('div');
                const checkbox = item.querySelector('input.checklist-checkbox');
                if (!contentDiv || !checkbox) return;

                let node = item.firstChild;
                while (node && node !== contentDiv) {
                    const nextNode = node.nextSibling;
                    if (node === checkbox) {
                        node = nextNode;
                        continue;
                    }

                    const text = node.nodeType === 3 ? node.textContent : node.innerHTML;
                    if (text.trim()) {
                        contentDiv.innerHTML = text + contentDiv.innerHTML;
                    }
                    node.remove();
                    node = nextNode;
                }
            });
        });

        contentEditor.addEventListener('beforeinput', (e) => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const startNode = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
            const item = startNode?.closest?.('.checklist-item');
            if (!item) return;
            const contentDiv = item.querySelector('div');
            if (contentDiv?.contains(startNode) || startNode === contentDiv) return;
            if (e.inputType && e.inputType.startsWith('insert')) {
                e.preventDefault();
                setCaretStart(contentDiv);
            }
        });

        contentEditor.addEventListener('input', handleEdit);

        // Checklist interaction — prevent checkbox focus on click
        contentEditor.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('checklist-checkbox')) {
                e.preventDefault();
            }
        }, true);

        contentEditor.addEventListener('click', (e) => {
            const item = e.target.closest('.checklist-item');
            if (!item) return;
            const contentDiv = item.querySelector('div');
            if (!contentDiv) return;
            if (contentDiv.contains(e.target) || e.target.classList.contains('checklist-checkbox')) return;
            setCaretStart(contentDiv);
        });

        // Checklist interaction — handle change immediately
        contentEditor.addEventListener('change', (e) => {
            if (e.target.classList.contains('checklist-checkbox')) {
                if (e.target.checked) {
                    e.target.setAttribute('checked', '');
                } else {
                    e.target.removeAttribute('checked');
                }
                handleEdit();
            }
        });

        // Keyboard Shortcuts & Backspace
        titleEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                contentEditor.focus();
                // Place cursor at the start
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(contentEditor);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }

            if (e.metaKey || e.ctrlKey) {
                const shortcuts = ['b', 'i', 'u', 's', '[', ']'];
                if (shortcuts.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    contentEditor.focus();
                }
            }
        });

        titleEditor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.originalEvent || e).clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        titleEditor.addEventListener('blur', () => {
            // Force plain text
            titleEditor.innerHTML = titleEditor.innerText;
            handleEdit();
        });

        contentEditor.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); updateToolbar(); }
                if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); updateToolbar(); }
                if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); updateToolbar(); }
            }

            const isTypingKey = e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
            if (isTypingKey) {
                const sel = window.getSelection();
                const range = sel.rangeCount ? sel.getRangeAt(0) : null;
                if (range) {
                    const startNode = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
                    const item = startNode?.closest?.('.checklist-item');
                    if (item) {
                        const contentDiv = item.querySelector('div');
                        if (contentDiv && !contentDiv.contains(startNode)) {
                            setCaretStart(contentDiv);
                        }
                    }
                }
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                const sel = window.getSelection();
                const node = sel.getRangeAt(0).startContainer.parentElement;
                const checklist = node.closest('.checklist-item');
                const isList = node.closest('li, ul, ol');

                if (checklist) {
                    if (!e.shiftKey) {
                        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                        handleEdit();
                    }
                    return;
                }

                if (e.shiftKey) {
                    document.execCommand('outdent', false, null);
                } else {
                    if (isList) {
                        document.execCommand('indent', false, null);
                    } else {
                        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                    }
                }
                updateToolbar();
                handleEdit();
                return;
            }

            // Auto-convert markdown shortcuts: "- ", "* ", "1. "
            if (e.key === ' ') {
                const sel = window.getSelection();
                const range = sel.getRangeAt(0);
                const node = range.startContainer;
                if (node.nodeType === 3) {
                    const textBefore = node.textContent.substring(0, range.startOffset).trim();
                    const isAtStart = range.startOffset <= 3;
                    if (isAtStart) {
                        const typeMap = { '-': 'dash', '*': 'bullet', '1.': 'number' };
                        const type = typeMap[textBefore];
                        if (type) {
                            e.preventDefault();
                            node.textContent = node.textContent.substring(range.startOffset);
                            applyListType(type);
                        }
                    }
                }
            }

            // Enter: exit empty lists, or create new list item
            if (e.key === 'Enter') {
                const { li, checklist } = getListContext();

                // Exit empty checklist
                if (checklist) {
                    e.preventDefault();
                    const contentDiv = checklist.querySelector('div:not(.checklist-item)');
                    if (contentDiv && contentDiv.innerText.trim() === '') {
                        const p = document.createElement('p');
                        p.innerHTML = '\u00A0';
                        checklist.replaceWith(p);
                        setCaretEnd(p);
                        return;
                    }
                    const newItem = document.createElement('div');
                    newItem.className = 'checklist-item';
                    newItem.innerHTML = '<input type="checkbox" class="checklist-checkbox"><div>\u200B</div>';
                    checklist.parentNode.insertBefore(newItem, checklist.nextSibling);
                    setCaretEnd(newItem.querySelector('div'));
                    handleEdit();
                    return;
                }

                // Exit empty list
                if (li && li.innerText.trim() === '') {
                    e.preventDefault();
                    clearAllListFormats();
                    return;
                }
            }

            // Backspace: convert checklist/list item to paragraph
            if (e.key === 'Backspace') {
                const sel = window.getSelection();
                const range = sel.getRangeAt(0);
                const node = range.startContainer;

                if (range.startOffset === 0) {
                    const el = node.nodeType === 3 ? node.parentElement : node;
                    const checklist = el.closest('.checklist-item');
                    const li = el.closest('li');
                    const blockquote = el.closest('blockquote');

                    if (checklist) {
                        e.preventDefault();
                        const p = document.createElement('p');
                        p.innerText = checklist.innerText || '\u00A0';
                        checklist.replaceWith(p);
                        setCaretEnd(p);
                        handleEdit();
                        return;
                    }

                    if (li || blockquote) {
                        e.preventDefault();
                        if (blockquote && !li) {
                            const p = document.createElement('p');
                            while (blockquote.firstChild) p.appendChild(blockquote.firstChild);
                            blockquote.replaceWith(p);
                        } else {
                            document.execCommand('outdent', false, null);
                        }
                        updateToolbar();
                        handleEdit();
                        return;
                    }
                }
            }
        });

        // --- List helpers ---
        const getListContext = () => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return {};
            const raw = sel.getRangeAt(0).startContainer;
            const node = raw.nodeType === 3 ? raw.parentElement : raw;
            return {
                node,
                li: node.closest('li'),
                list: node.closest('ul, ol'),
                checklist: node.closest('.checklist-item'),
            };
        };

        const setCaretStart = (el) => {
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        };

        const setCaretEnd = (el) => {
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
        };

        // Remove any list context and return a <p> with the content
        const clearAllListFormats = () => {
            const { li, list, checklist } = getListContext();
            let text = '';

            if (checklist) {
                text = checklist.querySelector('div')?.innerHTML || '';
                const p = document.createElement('p');
                p.innerHTML = text || '\u00A0';
                checklist.replaceWith(p);
                return p;
            }

            if (li && list) {
                text = li.innerHTML;
                const p = document.createElement('p');
                p.innerHTML = text || '\u00A0';
                if (list.querySelectorAll('li').length <= 1) {
                    list.replaceWith(p);
                } else {
                    li.remove();
                    contentEditor.insertBefore(p, list.nextSibling || null);
                }
                return p;
            }

            return null;
        };

        // Convert current block to a list type: 'bullet' | 'number' | 'dash' | 'check'
        const applyListType = (type) => {
            const { node, li, list, checklist } = getListContext();

            // --- Toggle off checklist ---
            if (checklist) {
                if (type === 'check') {
                    // Toggle checklist off
                    const p = document.createElement('p');
                    p.innerHTML = checklist.querySelector('div')?.innerHTML || '\u00A0';
                    checklist.replaceWith(p);
                    setCaretEnd(p);
                    return;
                }
                // Converting checklist to something else
                const text = checklist.querySelector('div')?.innerHTML || '';
                checklist.remove();
                if (type === 'bullet' || type === 'number' || type === 'dash') {
                    document.execCommand(type === 'number' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                    const ctx = getListContext();
                    if (ctx.li) ctx.li.innerHTML = text;
                    if (type === 'dash') {
                        const ul = node.closest('ul') || getListContext().list;
                        if (ul) ul.style.listStyleType = '"- "';
                    }
                    if (ctx.li) setCaretEnd(ctx.li);
                } else {
                    const p = document.createElement('p');
                    p.innerHTML = text || '\u00A0';
                    contentEditor.appendChild(p);
                    setCaretEnd(p);
                }
                return;
            }

            // --- Toggle off same list type ---
            if (list && li) {
                const isDashed = list.style.listStyleType === '"- "';
                const isOrdered = list.tagName === 'OL';
                const currentType = isDashed ? 'dash' : isOrdered ? 'number' : 'bullet';

                if (type === currentType) {
                    // Toggle off — convert to paragraph
                    const p = document.createElement('p');
                    p.innerHTML = li.innerHTML || '\u00A0';
                    if (list.querySelectorAll('li').length <= 1) {
                        list.replaceWith(p);
                    } else {
                        li.remove();
                        contentEditor.insertBefore(p, list.nextSibling || null);
                    }
                    setCaretEnd(p);
                    return;
                }

                // --- Switch list type ---
                const text = li.innerHTML;
                if (list.querySelectorAll('li').length <= 1) {
                    // Only one item — replace whole list
                    list.remove();
                } else {
                    li.remove();
                }

                if (type === 'check') {
                    const checkItem = document.createElement('div');
                    checkItem.className = 'checklist-item';
                    checkItem.innerHTML = `<input type="checkbox" class="checklist-checkbox"><div>${text || '\u200B'}</div>`;
                    contentEditor.appendChild(checkItem);
                    setCaretEnd(checkItem.querySelector('div'));
                } else {
                    document.execCommand(type === 'number' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                    const ctx = getListContext();
                    if (ctx.li) {
                        ctx.li.innerHTML = text;
                        if (type === 'dash') {
                            ctx.list.style.listStyleType = '"- "';
                        }
                        setCaretEnd(ctx.li);
                    }
                }
                return;
            }

            // --- Not in any list — create new ---
            if (type === 'check') {
                const checkItem = document.createElement('div');
                checkItem.className = 'checklist-item';
                const existingP = node.closest('p');
                const text = existingP?.innerHTML || node.textContent || '';
                checkItem.innerHTML = `<input type="checkbox" class="checklist-checkbox"><div>${text || '\u200B'}</div>`;
                if (existingP) existingP.replaceWith(checkItem);
                else contentEditor.appendChild(checkItem);
                setCaretEnd(checkItem.querySelector('div'));
            } else {
                document.execCommand(type === 'number' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                if (type === 'dash') {
                    const ctx = getListContext();
                    if (ctx.list) ctx.list.style.listStyleType = '"- "';
                }
            }
        };

        // Toolbar click handlers
        document.querySelectorAll('.notes-toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.getAttribute('data-command');
                contentEditor.focus();
                const sel = window.getSelection();
                const node = sel.rangeCount ? sel.getRangeAt(0).startContainer.parentElement : null;
                const checklist = node?.closest?.('.checklist-item');

                if (cmd === 'insertUnorderedList') return applyListType('bullet');
                if (cmd === 'insertOrderedList') return applyListType('number');
                if (cmd === 'insertChecklist') return applyListType('check');

                if (cmd === 'indent' && checklist) {
                    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                    handleEdit();
                    return;
                }

                if (cmd === 'outdent' && checklist) {
                    return;
                }

                if (cmd) {
                    document.execCommand(cmd, false, null);
                    setTimeout(updateToolbar, 10);
                }
                updateToolbar();
                playNotesClickSound();
            });
        });

        const monoBtn = document.getElementById('notes-mono-btn');
        if (monoBtn) {
            monoBtn.addEventListener('click', () => {
                const isMono = document.queryCommandValue('fontName').includes('monospace');
                if (isMono) {
                    // Reset to system font
                    document.execCommand('fontName', false, '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif');
                } else {
                    document.execCommand('fontName', false, 'monospace');
                }
                contentEditor.focus();
                playNotesClickSound(); // Mono button plays notes click sound
            });
        }

        const dashBtn = document.getElementById('notes-dash-btn');
        if (dashBtn) {
            dashBtn.addEventListener('click', () => {
                applyListType('dash');
                contentEditor.focus();
                updateToolbar();
                playNotesClickSound();
            });
        }

        const updateToolbar = () => {
            const isReadOnly = document.getElementById('panel-note-view')?.classList.contains('note-view-readonly');
            const activeElement = document.activeElement;
            const isTitleFocused = activeElement && (activeElement.id === 'active-note-title' || activeElement.closest('#active-note-title'));
            const toolbar = document.querySelector('.notes-header-right');

            if (isTitleFocused) {
                if (toolbar) {
                    toolbar.style.opacity = '0.3';
                    toolbar.style.pointerEvents = 'none';
                }
                return;
            } else if (toolbar) {
                toolbar.style.opacity = isReadOnly ? '0.35' : '1';
                toolbar.style.pointerEvents = isReadOnly ? 'none' : 'auto';
            }

            const selection = window.getSelection();
            const anchorNode = (selection.rangeCount > 0) ? selection.anchorNode : null;
            const parentNode = anchorNode ? (anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode) : null;
            if (parentNode && titleEditor && titleEditor.contains(parentNode)) return;
            const currentList = parentNode ? parentNode.closest('ul') : null;
            const isDashed = currentList && currentList.style.listStyleType === '"- "';

            document.querySelectorAll('.notes-header-right .notes-toolbar-btn').forEach(btn => {
                const cmd = btn.getAttribute('data-command');
                if (cmd) {
                    const state = document.queryCommandState(cmd);
                    if (state) {
                        // For unordered lists, only show active if NOT dashed
                        if (cmd === 'insertUnorderedList' && isDashed) {
                            btn.classList.remove('active');
                        } else {
                            btn.classList.add('active');
                        }
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });

            // Custom checks
            const isMono = document.queryCommandValue('fontName').includes('monospace');
            if (isMono) document.getElementById('notes-mono-btn')?.classList.add('active');
            else document.getElementById('notes-mono-btn')?.classList.remove('active');

            if (isDashed) {
                document.getElementById('notes-dash-btn')?.classList.add('active');
            } else {
                document.getElementById('notes-dash-btn')?.classList.remove('active');
            }
        };

        document.addEventListener('selectionchange', updateToolbar);
        titleEditor.addEventListener('focus', updateToolbar);
        titleEditor.addEventListener('blur', updateToolbar);
        contentEditor.addEventListener('focus', updateToolbar);

        const generateNewNotePermalink = () => {
            const pattern = /^\/notes\/new-note(?:-(\d+))?$/;
            let maxIndex = 0;
            Object.values(notesData).forEach(note => {
                const match = typeof note.permalink === 'string' ? note.permalink.match(pattern) : null;
                if (match) {
                    const index = match[1] ? parseInt(match[1], 10) : 1;
                    if (!Number.isNaN(index) && index > maxIndex) maxIndex = index;
                }
            });
            return `/notes/new-note-${maxIndex + 1}`;
        };

        const createNewNote = () => {
            const id = 'note-' + Date.now();
            const now = new Date();
            const title = getNotesLocale() === 'ja' ? '新規ノート' : 'New Note';
            notesData[id] = {
                title: title,
                folder: (currentFolder === 'all' || currentFolder === 'recently_deleted') ? 'all' : currentFolder,
                lastEdited: now.getTime(),
                content: '<p></p>',
                permalink: generateNewNotePermalink(),
                pinned: false
            };
            saveNotes();
            renderNotesList(currentFolder, true);
            const item = document.querySelector(`.note-preview[data-note-id="${id}"]`);
            if (item) item.click();
            setNoteViewReadOnly(false);
            setTimeout(() => {
                const tEd = document.getElementById('active-note-title');
                if (tEd) {
                    tEd.focus();
                    document.execCommand('selectAll', false, null);
                }
            }, 500);
            playNotesClickSound(); // New note creation plays sound
        };

        document.getElementById('new-note-btn-header')?.addEventListener('click', createNewNote);
        document.getElementById('new-note-btn-mobile')?.addEventListener('click', createNewNote);
        document.getElementById('new-folder-btn-top')?.addEventListener('click', createFolder);
        document.getElementById('new-folder-btn')?.addEventListener('click', createFolder); // hidden; legacy fallback

        openFolderContextMenu = (e, folderName, targetKey) => {
            const existing = document.getElementById('folder-context-menu');
            if (existing) existing.remove();

            const menu = document.createElement('div');
            menu.id = 'folder-context-menu';
            menu.className = 'note-context-menu';
            const folderRow = targetKey ? document.querySelector(`[data-target="${targetKey}"]`) : null;
            const isCustomRow = !!(folderRow && folderRow.classList.contains('custom'));
            const isCustom = isCustomRow || customFolders.includes(folderName);
            const isEditable = isCustom;

            if (isEditable) {
                const renameBtn = document.createElement('div');
                renameBtn.className = 'note-context-item';
                renameBtn.innerText = tcm('renameFolder');
                renameBtn.onclick = () => {
                    const newName = prompt(tcm('promptRenameFolder'), folderName);
                    const trimmedNewName = newName ? newName.trim() : '';
                    if (!trimmedNewName || trimmedNewName === folderName) return;
                    // Check all existing folder names to prevent conflicts
                    const allFolderNames = Object.values(folderMap);
                    if (allFolderNames.includes(trimmedNewName)) {
                        alert(tcm('folderExistsRename'));
                        return;
                    }

                    const oldKey = `panel-notes-${slugify(folderName)}`;
                    const newKey = `panel-notes-${slugify(trimmedNewName)}`;

                    // First: Update notes folder property (must happen before any rendering)
                    let updatedCount = 0;
                    Object.values(notesData).forEach(note => {
                        if (note.folder === folderName) {
                            note.folder = trimmedNewName;
                            updatedCount++;
                        }
                    });

                    if (isCustom) {
                        customFolders = customFolders.map(n => n === folderName ? trimmedNewName : n);
                        localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
                    }

                    if (folderMap[oldKey]) delete folderMap[oldKey];
                    folderMap[newKey] = trimmedNewName;

                    // Update the built-in folder element's data-target and label text
                    if (!isCustom && targetKey) {
                        const folderEl = document.querySelector(`[data-target="${targetKey}"]`);
                        if (folderEl) {
                            folderEl.setAttribute('data-target', newKey);
                            const infoDiv = folderEl.querySelector('.notes-folder-info');
                            if (infoDiv) {
                                // Replace only the text node, keep the img
                                Array.from(infoDiv.childNodes).forEach(node => {
                                    if (node.nodeType === Node.TEXT_NODE) node.remove();
                                });
                                infoDiv.appendChild(document.createTextNode(trimmedNewName));
                            }
                        }
                        delete folderMap[targetKey];
                    }

                    currentFolder = trimmedNewName;

                    // Save notes with updated folder names
                    saveNotes();
                    // Re-render folder list from persisted data
                    renderFolderList();
                    // Render notes for the renamed folder
                    renderNotesList(trimmedNewName);
                    menu.remove();
                    playNotesClickSound();
                };

                const separator = document.createElement('div');
                separator.style.height = '1px';
                separator.style.background = 'rgba(0,0,0,0.1)';
                separator.style.margin = '4px 0';
                separator.className = 'context-separator';

                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'note-context-item';
                deleteBtn.style.color = '#FF453A';
                deleteBtn.innerText = tcm('deleteFolder');
                deleteBtn.onclick = () => {
                    if (!confirm(tcm('confirmDeleteFolder', folderName))) return;
                    const folderKey = targetKey || `panel-notes-${slugify(folderName)}`;

                    if (isCustom) {
                        customFolders = customFolders.filter(n => n !== folderName);
                        localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
                    } else {
                        // Remove built-in folder element from DOM
                        const folderEl = document.querySelector(`[data-target="${folderKey}"]`);
                        if (folderEl) folderEl.remove();
                    }

                    if (folderMap[folderKey]) delete folderMap[folderKey];
                    Object.values(notesData).forEach(note => {
                        if (note.folder === folderName) note.folder = 'all';
                    });
                    saveNotes();
                    renderFolderList();
                    renderNotesList('all');
                    playNotesDeleteSound();
                    menu.remove();
                };

                menu.appendChild(renameBtn);
                menu.appendChild(separator);
                menu.appendChild(deleteBtn);
            } else {
                // System folders and built-in folders (All Notes, Personal, Projects, Deleted)
                const info = document.createElement('div');
                info.className = 'note-context-item';
                info.style.color = '#999';
                info.innerText = tcm('folderReadonly');
                menu.appendChild(info);
            }

            const x = (e.clientX || 0) - 10;
            const y = (e.clientY || 0) - 10;

            document.body.appendChild(menu);
            constrainMenuToViewport(menu, x, y);

            const closeFolderMenu = (ev) => {
                if (ev.button === 2) return; // ignore right-click
                if (!menu.contains(ev.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeFolderMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeFolderMenu), 10);
        };

        bindFolderClicks = () => {
            document.querySelectorAll('.folder-list-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const target = item.getAttribute('data-target');
                    const folderName = (target && Object.prototype.hasOwnProperty.call(folderMap, target))
                        ? folderMap[target]
                        : item.querySelector('.notes-folder-info')?.lastChild?.textContent?.trim() || item.textContent.trim();
                    currentFolder = folderName;
                    document.querySelectorAll('.notes-list-item').forEach(n => n.classList.remove('active-folder'));
                    item.classList.add('active-folder');
                    navigateTo('notes');
                    // Auto-open the latest note or pinned note
                    setTimeout(() => {
                        const firstNote = document.querySelector('.note-preview');
                        if (firstNote && window.innerWidth >= 800) {
                            firstNote.click();
                        }
                    }, 50);
                    playNotesClickSound();
                };

                let folderPressTimer;
                const clearFolderPressTimer = () => {
                    if (folderPressTimer) {
                        clearTimeout(folderPressTimer);
                        folderPressTimer = null;
                    }
                };

                item.onpointerdown = (e) => {
                    folderPressTimer = setTimeout(() => {
                        const target = item.getAttribute('data-target');
                        const folderName = (target && Object.prototype.hasOwnProperty.call(folderMap, target))
                            ? folderMap[target]
                            : item.querySelector('.notes-folder-info')?.lastChild?.textContent?.trim() || item.textContent.trim();
                        openFolderContextMenu(e, folderName, target);
                    }, 500);
                };

                item.onpointerup = clearFolderPressTimer;
                item.onpointerleave = clearFolderPressTimer;
                item.onpointercancel = clearFolderPressTimer;

                item.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const target = item.getAttribute('data-target');
                    const folderName = (target && Object.prototype.hasOwnProperty.call(folderMap, target))
                        ? folderMap[target]
                        : item.querySelector('.notes-folder-info')?.lastChild?.textContent?.trim() || item.textContent.trim();
                    openFolderContextMenu(e, folderName, target);
                };
            });
        };

        bindFolderClicks();
        document.getElementById('notes-back-btn')?.addEventListener('click', playNotesClickSound);
        document.getElementById('notes-back-to-folders')?.addEventListener('click', playNotesClickSound);
        document.getElementById('notes-sidebar-toggle')?.addEventListener('click', playNotesClickSound);
    }

    if (bookmark && notesModal && notesBackdrop) {
        let isMinimized = false;
        let wasFullscreenBeforeMinimize = false;

        const openNotes = () => {
            document.body.style.overflow = 'hidden';

            // Clear drag positions before showing so the modal starts centered
            notesModal.style.removeProperty('left');
            notesModal.style.removeProperty('top');
            notesModal.style.removeProperty('transform');

            notesBackdrop.classList.add('visible');
            notesModal.classList.remove('minimized');
            notesModal.classList.add('visible');

            if (wasFullscreenBeforeMinimize) {
                notesModal.classList.add('fullscreen');
            }
            bookmark.classList.add('active');
            isMinimized = false;

            currentFolder = 'all';
            renderFolderList();

            // Highlight 'All Notes' folder
            document.querySelectorAll('[data-target]').forEach(f => f.classList.remove('active-folder'));
            const allNotesFolder = document.querySelector('[data-target="panel-notes-all"]');
            if (allNotesFolder) allNotesFolder.classList.add('active-folder');

            renderNotesList('all');
            navigateTo('notes', { skipListRender: true });
        };

        const closeNotes = (e) => {
            document.body.style.overflow = '';
            if (e && e.stopPropagation) e.stopPropagation();

            notesBackdrop.classList.remove('visible');
            notesModal.classList.remove('visible');
            notesModal.classList.remove('minimized');
            notesModal.classList.remove('fullscreen');
            wasFullscreenBeforeMinimize = false;
            bookmark.classList.remove('active');

            // Clear manual JS transforms
            setTimeout(() => {
                notesModal.style.removeProperty('transform');
                notesModal.style.removeProperty('transition');
                notesModal.style.removeProperty('left');
                notesModal.style.removeProperty('top');
            }, 400);

            history.replaceState(null, null, '/');
            playNotesClickSound();
        };

        const openNoteByPermalink = (permalink) => {
            const noteId = Object.keys(notesData).find(id => notesData[id].permalink === permalink);
            if (!noteId) return false;
            const data = notesData[noteId];
            document.getElementById('active-note-content').setAttribute('data-current-note', noteId);
            document.getElementById('active-note-content').innerHTML = data.content;
            document.getElementById('active-note-title').innerText = data.title;
            document.getElementById('active-note-date').innerText =  formatFullNoteDate(data.lastEdited);
            setNoteViewReadOnly(isBuiltInNoteId(noteId) || data.folder === 'recently_deleted');
            currentFolder = 'all';
            renderNotesList('all', false);
            document.querySelectorAll('[data-target]').forEach(f => f.classList.remove('active-folder'));
            const allNotesFolder = document.querySelector('[data-target="panel-notes-all"]');
            if (allNotesFolder) allNotesFolder.classList.add('active-folder');
            const noteEl = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteEl) {
                document.querySelectorAll('.note-preview').forEach(n => n.classList.remove('selected'));
                noteEl.classList.add('selected');
            }
            navigateTo('view');
            return true;
        };

        window.addEventListener('popstate', (e) => {
            const path = window.location.pathname;
            if (path !== '/' && path !== '/index.html') {
                if (openNoteByPermalink(path)) {
                    notesBackdrop.classList.add('visible');
                    notesModal.classList.add('visible');
                    bookmark.classList.add('active');
                }
            } else {
                closeNotes();
            }
        });

        const minimizeNotes = (e) => {
            if (window.innerWidth < 800) {
                closeNotes(e);
                return;
            }
            document.body.style.overflow = 'hidden';
            if (e && e.stopPropagation) e.stopPropagation();
            wasFullscreenBeforeMinimize = notesModal.classList.contains('fullscreen');

            // Clear drag positioning so CSS .minimized can place it at the corner
            notesModal.style.removeProperty('left');
            notesModal.style.removeProperty('top');
            notesModal.style.removeProperty('transform');

            notesBackdrop.classList.remove('visible');
            notesModal.classList.add('minimized');
            notesModal.classList.remove('fullscreen');
            bookmark.classList.remove('active');
            isMinimized = true;
            playNotesClickSound();
        };

        const maximizeNotes = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            if (notesModal.classList.contains('fullscreen')) {
                if (window.innerWidth < 800) {
                    notesModal.classList.remove('fullscreen');
                    return;
                }
                notesModal.style.transition = 'none';
                notesModal.classList.remove('fullscreen');
                notesModal.style.removeProperty('left');
                notesModal.style.removeProperty('top');
                notesModal.style.removeProperty('transform');
                setTimeout(() => notesModal.style.removeProperty('transition'), 50);
            } else {
                notesModal.classList.add('fullscreen');
            }
        };

        notesModal.addEventListener('click', (e) => {
            if (isMinimized && !hasDragged) {
                openNotes();
            }
        });

        bookmark.addEventListener('click', openNotes);
        notesBackdrop.addEventListener('click', closeNotes);

        document.querySelectorAll('.mac-close, #mobile-done-btn').forEach(btn => {
            btn.addEventListener('click', closeNotes);
        });

        // Draggable Sheet Logic (Mobile Drawer)
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        function findScrollableAncestor(el, root) {
            while (el && el !== root) {
                const style = getComputedStyle(el);
                if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                    return el;
                }
                el = el.parentElement;
            }
            return null;
        }

        const handleMobileDragStart = (e) => {
            // Don't interfere with minimized modal drag (handleDragStart handles that)
            if (notesModal.classList.contains('minimized')) return;

            const isDesktop = window.innerWidth >= 800;

            // On desktop, let header drags go to handleDragStart for repositioning
            if (isDesktop && e.target.closest('.notes-header')) return;

            const scrollable = findScrollableAncestor(e.target, notesModal);
            if (scrollable && scrollable.scrollTop > 0) return;

            currentY = 0;
            startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            isDragging = true;
            notesModal.style.setProperty('transition', 'none', 'important');
            clearTimeout(window._mobileDragReset);
            e.stopPropagation();
        };

        const handleMobileDragMove = (e) => {
            if (!isDragging) return;
            currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                e.preventDefault();
                notesModal.style.setProperty('transform', `translateY(${diff}px)`, 'important');
            }
        };

        const handleMobileDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            notesModal.style.removeProperty('transition');
            const diff = currentY - startY;
            if (diff > 100) {
                notesModal.style.removeProperty('transform');
                closeNotes();
            } else if (diff > 5 && window.innerWidth < 800) {
                notesModal.style.setProperty('transform', 'translateY(0)', 'important');
                clearTimeout(window._mobileDragReset);
                window._mobileDragReset = setTimeout(() => notesModal.style.removeProperty('transform'), 400);
            }
        };

        // Draggable Minimized & Main Modal Logic
        let minDragging = false;
        let mainDragging = false;
        let hasDragged = false;
        let modalOffsetX, modalOffsetY;
        let startDragX, startDragY;

        const handleDragStart = (e) => {
            if (notesModal.classList.contains('fullscreen')) return;

            const isHeader = e.target.closest('.notes-header');
            const isMinimized = notesModal.classList.contains('minimized');

            if (!isHeader && !isMinimized) return;

            if (isMinimized) minDragging = true;
            else mainDragging = true;

            hasDragged = false;
            const event = e.type.includes('touch') ? e.touches[0] : e;
            const rect = notesModal.getBoundingClientRect();
            modalOffsetX = event.clientX - rect.left;
            modalOffsetY = event.clientY - rect.top;
            startDragX = event.clientX;
            startDragY = event.clientY;

            notesModal.style.transition = 'none';
            if (isHeader) e.preventDefault(); // Prevent text selection
        };

        const handleDragMove = (e) => {
            if (!minDragging && !mainDragging) return;
            const event = e.type.includes('touch') ? e.touches[0] : e;

            if (Math.abs(event.clientX - startDragX) > 5 || Math.abs(event.clientY - startDragY) > 5) {
                hasDragged = true;
            }

            let x = event.clientX - modalOffsetX;
            let y = event.clientY - modalOffsetY;

            // Bound constraints
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const rect = notesModal.getBoundingClientRect();

            x = Math.max(0, Math.min(x, winW - rect.width));
            y = Math.max(0, Math.min(y, winH - rect.height));

            notesModal.style.setProperty('left', `${x}px`, 'important');
            notesModal.style.setProperty('top', `${y}px`, 'important');
            notesModal.style.setProperty('transform', 'none', 'important');
        };

        const handleDragEnd = (forceSnap = false) => {
            if (!minDragging && !mainDragging && !forceSnap) return;

            const wasMin = minDragging || (forceSnap && notesModal.classList.contains('minimized'));
            minDragging = false;
            mainDragging = false;

            // Don't re-snap if the user just tapped without dragging (allow openNotes to handle it)
            if (wasMin && !hasDragged && !forceSnap) {
                notesModal.style.transition = '';
                return;
            }

            notesModal.style.transition = 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)';

            if (wasMin) {
                const rect = notesModal.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const bannerH = 20;
                const footerH = revelationActive ? 100 : 40;

                let snapX, snapY;
                if (centerX < winW / 2) snapX = 40;
                else snapX = winW - rect.width - 40;

                if (centerY < winH / 2) snapY = bannerH + 12;
                else snapY = winH - rect.height - footerH;

                notesModal.style.setProperty('left', `${snapX}px`, 'important');
                notesModal.style.setProperty('top', `${snapY}px`, 'important');
            }
        };

        let revelationActive = false;
        window.addEventListener('scroll', () => {
            const wasActive = revelationActive;
            revelationActive = window.scrollY > 0;

            if (wasActive !== revelationActive && notesModal.classList.contains('minimized')) {
                // Re-snap if footer state changed while minimized
                handleDragEnd(true);
            }
        });

        if (window.innerWidth >= 800) {
            notesModal.addEventListener('mousedown', handleDragStart);
            notesModal.addEventListener('touchstart', handleDragStart, { passive: true });
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchend', handleDragEnd);
        }

        // Drag-to-close on any device
        notesModal.addEventListener('mousedown', handleMobileDragStart);
        notesModal.addEventListener('touchstart', handleMobileDragStart, { passive: true });
        window.addEventListener('mousemove', handleMobileDragMove);
        window.addEventListener('touchmove', handleMobileDragMove, { passive: false });
        window.addEventListener('mouseup', handleMobileDragEnd);
        window.addEventListener('touchend', handleMobileDragEnd);

        document.querySelectorAll('.mac-min').forEach(btn => {
            btn.addEventListener('click', minimizeNotes);
        });

        document.querySelectorAll('.mac-max').forEach(btn => {
            btn.addEventListener('click', maximizeNotes);
        });

        document.querySelectorAll('[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('[data-target]').forEach(f => f.classList.remove('active-folder'));
                item.classList.add('active-folder');

                const target = e.currentTarget.getAttribute('data-target');
                currentFolder = folderMap[target] || 'all';

                renderNotesList(currentFolder);
                let autoSelected = false;
                if (window.innerWidth >= 800) {
                    const firstNote = document.querySelector('.note-preview');
                    if (firstNote) {
                        firstNote.click();
                        autoSelected = true;
                    }
                }
                if (!autoSelected) playNotesClickSound();
                navigateTo('notes', { skipListRender: true });
            });
        });

        // Auto Purge Logic
        const purgeDeleted = () => {
            const now = Date.now();
            const threeHours = 3 * 3600 * 1000;
            let changed = false;
            Object.keys(notesData).forEach(id => {
                if (notesData[id].folder === 'recently_deleted' && (now - notesData[id].deletedAt > threeHours)) {
                    delete notesData[id];
                    changed = true;
                }
            });
            if (changed) {
                saveNotes();
                renderNotesList(currentFolder);
            }
        };
        setInterval(purgeDeleted, 60000);
        purgeDeleted();

        const initialPath = window.location.pathname.replace(/\/$/, '') || '/';
        if (initialPath !== '/' && initialPath !== '/index.html') {
            if (openNoteByPermalink(initialPath)) {
                renderFolderList();
                document.body.style.overflow = 'hidden';
                notesBackdrop.classList.add('visible');
                notesModal.classList.add('visible');
                bookmark.classList.add('active');
            }
        }
    }

    if (bookmark && notesModal && notesBackdrop) {

        document.querySelectorAll('[data-back]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backTarget = e.currentTarget.getAttribute('data-back');
                if (backTarget === 'panel-folders') {
                    navigateTo('folders');
                } else {
                    navigateTo('notes');
                }
                playNotesClickSound();
            });
        });

        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sharedStoplights = document.getElementById('shared-stoplights');

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const isCollapsed = panels.folders.classList.toggle('collapsed');
                if (window.innerWidth >= 800) {
                    if (isCollapsed) {
                        sidebarToggle.style.marginLeft = "70px";
                    } else {
                        sidebarToggle.style.marginLeft = "0px";
                    }
                }
                playNotesClickSound();
            });
        }

    }

});