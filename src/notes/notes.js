document.addEventListener('DOMContentLoaded', () => {
    const notesModal = document.getElementById('notes-modal');
    const notesBackdrop = document.getElementById('notes-backdrop');

    const panels = {
        folders: document.getElementById('panel-folders'),
        notes: document.getElementById('panel-notes'),
        view: document.getElementById('panel-note-view')
    };

    const CUSTOM_FOLDER_KEY = 'apple_notes_custom_folders';
    const SEED_PINS_KEY = 'apple_notes_seed_pins';
    let customFolders = JSON.parse(localStorage.getItem(CUSTOM_FOLDER_KEY) || '[]');

    const folderMap = {
        'panel-notes-all': 'all',
        'panel-notes-documentation': 'Documentation',
        'panel-notes-deleted': 'recently_deleted'
    };

    let currentFolder = 'all';

    const folderGroup = document.querySelector('.notes-list-group');
    let lastSelectedIndex = null;

    let seedNoteIds = new Set();
    const isBuiltInNoteId = (id) => seedNoteIds.has(id);

    const separator = () => {
        const el = document.createElement('div');
        el.className = 'context-separator';
        el.style.cssText = 'height:.0625rem;background:rgba(0,0,0,0.1);margin:4px 0';
        return el;
    };

    const contextMenu = (e, id) => {
        document.getElementById(id)?.remove();
        const menu = document.createElement('div');
        menu.id = id;
        menu.className = 'note-context-menu';
        document.body.appendChild(menu);
        constrainMenuToViewport(menu, (e.clientX || 0) - 10, (e.clientY || 0) - 10);
        return menu;
    };

    const closeOnOutside = (menu) => {
        const close = (ev) => {
            if (ev.button === 2 || menu.contains(ev.target)) return;
            menu.remove();
            document.removeEventListener('click', close);
        };
        setTimeout(() => document.addEventListener('click', close), 10);
    };

    let openFolderContextMenu = () => { };
    let bindFolderClicks = () => { };

    const setNoteViewReadOnly = (readonly) => {
        const titleEd = document.getElementById('active-note-title');
        const contentEd = document.getElementById('active-note-content');
        const toolbar = document.querySelectorAll('.notes-toolbar-btn, .toolbar-divider');
        const panel = document.getElementById('panel-note-view');
        if (!titleEd || !contentEd) return;
        titleEd.contentEditable = readonly ? 'false' : 'true';
        contentEd.contentEditable = readonly ? 'false' : 'true';
        panel?.classList.toggle('note-view-readonly', readonly);
        toolbar.forEach(element => {
            element.style.opacity = readonly ? '0.35' : '';
            element.style.pointerEvents = readonly ? 'none' : '';
        });
    };

    const displayNote = (noteId, data) => {
        const el = document.getElementById('active-note-content');
        const changed = el.getAttribute('data-current-note') !== String(noteId);
        el.setAttribute('data-current-note', noteId);
        el.innerHTML = data.content;
        document.getElementById('active-note-title').innerText = data.title;
        document.getElementById('active-note-date').innerText = formatFullNoteDate(data.lastEdited);
        setNoteViewReadOnly(isBuiltInNoteId(noteId) || data.folder === 'recently_deleted');
        if (changed) el.closest('.notes-content').scrollTop = 0;
    };

    const slugify = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    const constrainMenuToViewport = (menu, x, y) => {
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        setTimeout(() => {
            const { width, height } = menu.getBoundingClientRect();
            const pad = 10;
            const clamp = (val, max) => Math.max(pad, Math.min(val, max - width - pad));
            if (x + width > window.innerWidth - pad || x < pad) {
                menu.style.left = clamp(x, window.innerWidth) + 'px';
            }
            if (y + height > window.innerHeight - pad || y < pad) {
                menu.style.top = clamp(y, window.innerHeight) + 'px';
            }
        }, 0);
    };

    const getMoveTargets = () => [...new Set(Object.values(folderMap))].filter(f => f && f !== 'recently_deleted' && f !== 'all');

    const renderFolderList = () => {
        if (!folderGroup) return;

        folderGroup.querySelectorAll('.folder-list-item.custom').forEach(el => el.remove());

        const divider = folderGroup.querySelector('div[style*="height: .0625rem"]');

        customFolders.forEach(folderName => {
            const folderKey = `panel-notes-${slugify(folderName)}`;
            folderMap[folderKey] = folderName;

            const item = document.createElement('div');
            item.className = 'notes-list-item folder-list-item custom';
            item.setAttribute('data-target', folderKey);
            item.dataset.customFolder = 'true';
            item.style.userSelect = 'none';
            item.innerHTML = `
                <div class="notes-folder-info"><svg class="icon folder-icon"><use href="#icon-folder"/></svg>${folderName}</div>
                <div><span class="notes-count" id="count-${folderKey}">0</span></div>
            `;

            if (divider) folderGroup.insertBefore(item, divider);
            else folderGroup.appendChild(item);
        });

        updateCounts();
        bindFolderClicks();
    };

    const createFolder = () => {
        const folderName = prompt('Enter new folder name:');
        if (!folderName) return;
        if (['All Notes', 'Documentation', 'Recently Deleted'].includes(folderName)) {
            alert('That folder name is reserved.');
            return;
        }
        if (customFolders.includes(folderName)) {
            alert('A folder with that name already exists.');
            return;
        }
        customFolders.push(folderName);
        localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
        renderFolderList();
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
        const noteFiles = ['overview', "editor"];
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
                pinned: m.pinned === true || m.pinned === 'true' || m.pinned === '1'
            };
        }));
        return out;
    };

    let notesReady = false;
    let notesData = {};

    const hydratePromise = (async () => {
        notesData = await hydrateNotes();
        seedNoteIds = new Set(Object.keys(notesData));
        
        const savedNotes = localStorage.getItem('apple_notes_data');
        if (savedNotes) {
            const userNotes = JSON.parse(savedNotes);
            for (const [id, note] of Object.entries(userNotes)) {
                if (!seedNoteIds.has(id)) notesData[id] = note;
            }
        }
        const savedSeedPins = localStorage.getItem(SEED_PINS_KEY);
        if (savedSeedPins) {
            const pins = JSON.parse(savedSeedPins);
            for (const [id, pinned] of Object.entries(pins)) {
                if (seedNoteIds.has(id) && notesData[id]) notesData[id].pinned = pinned;
            }
        }
        notesReady = true;

        updateCounts(); 
        renderFolderList();
    })();

    const updateCounts = () => {
        const counts = { all: 0, Documentation: 0, recently_deleted: 0 };
        Object.values(notesData).forEach(note => {
            if (note.folder === 'recently_deleted') { counts.recently_deleted++; return; }
            counts.all++;
            if (note.folder && note.folder !== 'all' && note.folder !== 'recently_deleted') {
                counts[note.folder] = (counts[note.folder] || 0) + 1;
            }
        });
        const countIds = { 'count-all': counts.all, 'count-documentation': counts.Documentation, 'count-deleted': counts.recently_deleted };
        Object.entries(countIds).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.innerText = val; });
        customFolders.forEach(name => {
            const el = document.getElementById(`count-panel-notes-${slugify(name)}`);
            if (el) el.innerText = counts[name] || 0;
        });
    };

    const saveNotes = () => {
        const userNotes = {};
        for (const [id, { title, folder, lastEdited, content, pinned }] of Object.entries(notesData)) {
            if (!seedNoteIds.has(id)) userNotes[id] = { title, folder, lastEdited, content, pinned };
        }
        localStorage.setItem('apple_notes_data', JSON.stringify(userNotes));
        updateCounts();
    };

    const saveSeedPins = () => {
        const pins = {};
        for (const id of seedNoteIds) {
            if (notesData[id]) pins[id] = notesData[id].pinned;
        }
        localStorage.setItem(SEED_PINS_KEY, JSON.stringify(pins));
    };

    const formatNoteDate = (timestamp) => {
        const now = new Date();
        const d = new Date(timestamp);
        if (now.toDateString() === d.toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' });

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';

        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });

        return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    const formatFullNoteDate = (timestamp) => {
        const d = new Date(timestamp);
        const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' });
        return `${dateStr} at ${timeStr}`;
    };

    function renderNotesList(folderFilter, autoSelect = true) {
        if (!notesReady) return;
        const listContainer = document.getElementById('notes-list-container');
        if (!listContainer) return;

        const prevSelection = document.querySelector('.note-preview.selected')?.getAttribute('data-note-id');
        let selectionTarget = null;
        listContainer.innerHTML = '';

        if (folderFilter === 'recently_deleted') {
            const notice = document.createElement('div');
            notice.className = 'notes-delete-notice';
            notice.innerText = 'Deleted notes are permanently removed after 30 days.';
            listContainer.appendChild(notice);
        }
        let filteredNotes = Object.keys(notesData).filter(key => {
            const note = notesData[key];
            if (folderFilter === 'all') return note.folder !== 'recently_deleted';
            return note.folder === folderFilter;
        });

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

        const listHeader = (text) => {
            const h = document.createElement('div');
            h.innerText = text;
            h.style.cssText = 'font-size:0.875rem;user-select:none;font-weight:500;color:#8e8e93;padding:12px 16px 4px';
            return h;
        };

        const titleNode = document.getElementById('notes-header-title');
        if (titleNode) {
            const titles = { recently_deleted: 'Recently Deleted', all: 'All Notes', Documentation: 'Documentation' };
            titleNode.innerText = titles[folderFilter] || folderFilter;
        }

        filteredNotes.forEach(noteId => {
            const data = notesData[noteId];

            if (data.pinned && !hasPinnedHeader) {
                listContainer.appendChild(listHeader('Pinned'));
                hasPinnedHeader = true;
            } else if (!data.pinned && hasPinnedHeader && !hasNotesHeader && folderFilter !== 'recently_deleted') {
                listContainer.appendChild(listHeader('Notes'));
                hasNotesHeader = true;
            }

            const previewText = extractPreviewText(data.content);

            const el = document.createElement('div');
            el.className = 'notes-list-item note-preview';
            el.setAttribute('data-note-id', noteId);
            if (data.pinned) el.classList.add('note-pinned');
            const listDateDisplay = formatNoteDate(data.lastEdited);
            el.innerHTML = `
                <div class="note-preview-title">${data.title}</div>
                <div class="note-preview-date-row">
                    <span class="notes-date-inline">${listDateDisplay}</span>
                    <span class="note-preview-desc">${previewText}</span>
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

                displayNote(noteId, data);
                navigateTo('view');

                lastSelectedIndex = currentIndex;
            });

            let pressTimer;
            let isLongPress = false;
            const clearTimer = () => {
                clearTimeout(pressTimer);
            };

            const handleNoteAction = (e) => {
                isLongPress = true;
                e.preventDefault();
                e.stopPropagation();

                const menu = contextMenu(e, 'note-context-menu');

                const isDeleted = data.folder === 'recently_deleted';

                if (isDeleted) {
                    const restoreBtn = document.createElement('div');
                    restoreBtn.className = 'note-context-item';
                    restoreBtn.innerText = 'Recover Note';
                    restoreBtn.onclick = () => {
                        data.folder = data.originalFolder || 'Notes';
                        delete data.deletedAt;
                        delete data.originalFolder;
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                    };
                    menu.appendChild(restoreBtn);

                    const delBtn = document.createElement('div');
                    delBtn.className = 'note-context-item';
                    delBtn.style.color = '#FF453A';
                    delBtn.innerText = 'Delete Permanently';
                    delBtn.onclick = () => {
                        delete notesData[noteId];
                        saveNotes();
                        if (isBuiltInNoteId(noteId)) saveSeedPins();
                        renderNotesList(folderFilter);
                        menu.remove();
                    };
                    menu.appendChild(delBtn);
                } else {
                    const pinBtn = document.createElement('div');
                    pinBtn.className = 'note-context-item';
                    pinBtn.innerText = data.pinned ? 'Unpin Note' : 'Pin Note';
                    pinBtn.onclick = () => {
                        data.pinned = !data.pinned;
                        if (isBuiltInNoteId(noteId)) {
                            saveSeedPins();
                        } else {
                            saveNotes();
                        }
                        renderNotesList(folderFilter);
                        menu.remove();
                    };
                    menu.appendChild(pinBtn);

                    if (!isBuiltInNoteId(noteId)) {
                        menu.appendChild(separator());

                        getMoveTargets().forEach(f => {
                            if (data.folder === f) return;
                            const moveBtn = document.createElement('div');
                            moveBtn.className = 'note-context-item';
                            moveBtn.innerText = `Move to ${f}`;
                            moveBtn.onclick = () => {
                                data.folder = f === 'all' ? 'all' : f;
                                saveNotes();
                                renderNotesList(folderFilter);
                                menu.remove();
                            };
                            menu.appendChild(moveBtn);
                        });

                        menu.appendChild(separator());

                        const actionBtn = document.createElement('div');
                        actionBtn.className = 'note-context-item';
                        actionBtn.style.color = '#FF453A';
                        actionBtn.innerText = 'Delete Note';
                        actionBtn.onclick = () => {
                            data.originalFolder = data.folder;
                            data.folder = 'recently_deleted';
                            data.deletedAt = Date.now();
                            data.pinned = false;
                            saveNotes();
                            if (isBuiltInNoteId(noteId)) saveSeedPins();
                            renderNotesList(folderFilter);
                            menu.remove();
                        };
                        menu.appendChild(actionBtn);
                    }
                }

                closeOnOutside(menu);
            };

            const handleMultiNoteAction = (e) => {
                const selectedEls = document.querySelectorAll('.note-preview.selected');
                const selectedIds = Array.from(selectedEls).map(el => el.getAttribute('data-note-id'));

                if (selectedIds.length <= 1) return handleNoteAction(e);

                e.preventDefault();
                e.stopPropagation();

                const menu = contextMenu(e, 'note-context-menu');
                const userSelectedIds = selectedIds.filter(id => !isBuiltInNoteId(id));
                const isInDeleted = folderFilter === 'recently_deleted';
                const isAllUser = userSelectedIds.length === selectedIds.length && !isInDeleted;

                if (isInDeleted) {
                    const recoverBtn = document.createElement('div');
                    recoverBtn.className = 'note-context-item';
                    recoverBtn.innerText = `Recover ${selectedIds.length} Notes`;
                    recoverBtn.onclick = () => {
                        selectedIds.forEach(id => {
                            notesData[id].folder = notesData[id].originalFolder || 'Notes';
                            delete notesData[id].deletedAt;
                            delete notesData[id].originalFolder;
                        });
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                    };
                    menu.appendChild(recoverBtn);

                    const permDelBtn = document.createElement('div');
                    permDelBtn.className = 'note-context-item';
                    permDelBtn.style.color = '#FF453A';
                    permDelBtn.innerText = `Delete ${selectedIds.length} Notes Permanently`;
                    permDelBtn.onclick = () => {
                        selectedIds.forEach(id => { delete notesData[id]; });
                        saveNotes();
                        saveSeedPins();
                        renderNotesList(folderFilter);
                        menu.remove();
                    };
                    menu.appendChild(permDelBtn);
                } else if (selectedIds.length > 0) {
                    const pinnedCount = selectedIds.filter(id => notesData[id]?.pinned).length;
                    const unpinnedCount = selectedIds.length - pinnedCount;

                    if (unpinnedCount > 0) {
                        const pinBtn = document.createElement('div');
                        pinBtn.className = 'note-context-item';
                        pinBtn.innerText = `Pin ${unpinnedCount} Notes`;
                        pinBtn.onclick = () => {
                            selectedIds.forEach(id => { if (!notesData[id]?.pinned) notesData[id].pinned = true; });
                            saveNotes();
                            saveSeedPins();
                            renderNotesList(folderFilter);
                            menu.remove();
                        };
                        menu.appendChild(pinBtn);
                    }

                    if (pinnedCount > 0) {
                        const unpinBtn = document.createElement('div');
                        unpinBtn.className = 'note-context-item';
                        unpinBtn.innerText = `Unpin ${pinnedCount} Notes`;
                        unpinBtn.onclick = () => {
                            selectedIds.forEach(id => { if (notesData[id]?.pinned) notesData[id].pinned = false; });
                            saveNotes();
                            saveSeedPins();
                            renderNotesList(folderFilter);
                            menu.remove();
                        };
                        menu.appendChild(unpinBtn);
                    }
                }

                if (isAllUser) {
                    menu.appendChild(separator());

                    const selectedFolders = [...new Set(userSelectedIds.map(id => notesData[id].folder))];
                    getMoveTargets().forEach(f => {
                        if (selectedFolders.every(sf => sf === f)) return;
                        const mbtn = document.createElement('div');
                        mbtn.className = 'note-context-item';
                        mbtn.innerText = `Move ${userSelectedIds.length} Notes to ${f}`;
                        mbtn.onclick = () => {
                            userSelectedIds.forEach(id => { notesData[id].folder = f; });
                            saveNotes();
                            renderNotesList(folderFilter);
                            menu.remove();
                        };
                        menu.appendChild(mbtn);
                    });

                    menu.appendChild(separator());

                    const delBtn = document.createElement('div');
                    delBtn.className = 'note-context-item';
                    delBtn.style.color = '#FF453A';
                    delBtn.innerText = `Delete ${userSelectedIds.length} Notes`;
                    delBtn.onclick = () => {
                        userSelectedIds.forEach(id => {
                            notesData[id].originalFolder = notesData[id].folder;
                            notesData[id].folder = 'recently_deleted';
                            notesData[id].deletedAt = Date.now();
                            notesData[id].pinned = false;
                        });
                        saveNotes();
                        renderNotesList(folderFilter);
                        menu.remove();
                    };
                    menu.appendChild(delBtn);
                }

                closeOnOutside(menu);
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
                clearTimer();
                pressTimer = setTimeout(() => {
                    handleNoteAction(e);
                }, 500); 
            });
            el.addEventListener('pointermove', clearTimer);
            el.addEventListener('pointerup', clearTimer);
            el.addEventListener('pointercancel', clearTimer);
            el.addEventListener('pointerleave', clearTimer);

            if (noteId === selectionTarget) {
                el.classList.add('selected');
                if (autoSelect && selectionTarget) {
                    displayNote(noteId, data);
                }
            }

            listContainer.appendChild(el);
        });
    }

    const titleEditor = document.getElementById('active-note-title');
    const contentEditor = document.getElementById('active-note-content');

    const syncCheckboxState = () => {
        contentEditor.querySelectorAll('.checklist-checkbox').forEach(cb => {
            cb[cb.checked ? 'setAttribute' : 'removeAttribute']('checked', '');
        });
    };

    const extractPreviewText = (content) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content || '';
        const firstChild = tempDiv.querySelector('li, p, div, blockquote, h1, h2, h3, h4, h5, h6');
        const rawText = (firstChild || tempDiv).textContent || (firstChild || tempDiv).innerText || '';
        return rawText.replace(/\s+/g, ' ').trim().substring(0, 120);
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
                saveNotes();
                document.getElementById('active-note-date').innerText = formatFullNoteDate(notesData[noteId].lastEdited);
                const el = document.querySelector(`.note-preview[data-note-id="${noteId}"]`);
                if (el) {
                    const titleEl = el.querySelector('.note-preview-title');
                    if (titleEl) titleEl.textContent = notesData[noteId].title;
                    const descEl = el.querySelector('.note-preview-desc');
                    if (descEl) descEl.textContent = extractPreviewText(notesData[noteId].content);
                }
            }
        };

        titleEditor.addEventListener('input', handleEdit);

        // Normalize stray nodes inside checklist items and keep the caret inside the checklist text area
        contentEditor.addEventListener('input', (event) => {
            handleEdit(event);

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
                placeCaret(contentDiv);
            }
        });

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
            placeCaret(contentDiv);
        });

        // Checklist interaction — handle change immediately
        contentEditor.addEventListener('change', (e) => {
            if (e.target.classList.contains('checklist-checkbox')) {
                e.target[e.target.checked ? 'setAttribute' : 'removeAttribute']('checked', '');
                handleEdit();
            }
        });

        // Keyboard Shortcuts & Backspace
        titleEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                contentEditor.focus();
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
                            placeCaret(contentDiv);
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

                if (checklist) {
                    e.preventDefault();
                    const contentDiv = checklist.querySelector('div:not(.checklist-item)');
                    if (contentDiv && contentDiv.innerText.trim() === '') {
                        const p = document.createElement('p');
                        p.innerHTML = '\u00A0';
                        checklist.replaceWith(p);
                        placeCaret(p, true);
                        return;
                    }
                    const newItem = document.createElement('div');
                    newItem.className = 'checklist-item';
                    newItem.innerHTML = '<input type="checkbox" class="checklist-checkbox"><div>\u200B</div>';
                    checklist.parentNode.insertBefore(newItem, checklist.nextSibling);
                    placeCaret(newItem.querySelector('div'), true);
                    handleEdit();
                    return;
                }

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
                        placeCaret(p, true);
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

        const placeCaret = (el, atEnd) => {
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(!atEnd);
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

        const applyListType = (type) => {
            const { node, li, list, checklist } = getListContext();

            if (checklist) {
                if (type === 'check') {
                    const p = document.createElement('p');
                    p.innerHTML = checklist.querySelector('div')?.innerHTML || '\u00A0';
                    checklist.replaceWith(p);
                    placeCaret(p, true);
                    return;
                }
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
                    if (ctx.li) placeCaret(ctx.li, true);
                } else {
                    const p = document.createElement('p');
                    p.innerHTML = text || '\u00A0';
                    contentEditor.appendChild(p);
                    placeCaret(p, true);
                }
                return;
            }

            if (list && li) {
                const isDashed = list.style.listStyleType === '"- "';
                const isOrdered = list.tagName === 'OL';
                const currentType = isDashed ? 'dash' : isOrdered ? 'number' : 'bullet';

                if (type === currentType) {
                    const p = document.createElement('p');
                    p.innerHTML = li.innerHTML || '\u00A0';
                    if (list.querySelectorAll('li').length <= 1) {
                        list.replaceWith(p);
                    } else {
                        li.remove();
                        contentEditor.insertBefore(p, list.nextSibling || null);
                    }
                    placeCaret(p, true);
                    return;
                }

                const text = li.innerHTML;
                if (list.querySelectorAll('li').length <= 1) {
                    list.remove();
                } else {
                    li.remove();
                }

                if (type === 'check') {
                    const checkItem = document.createElement('div');
                    checkItem.className = 'checklist-item';
                    checkItem.innerHTML = `<input type="checkbox" class="checklist-checkbox"><div>${text || '\u200B'}</div>`;
                    contentEditor.appendChild(checkItem);
                    placeCaret(checkItem.querySelector('div'), true);
                } else {
                    document.execCommand(type === 'number' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                    const ctx = getListContext();
                    if (ctx.li) {
                        ctx.li.innerHTML = text;
                        if (type === 'dash') {
                            ctx.list.style.listStyleType = '"- "';
                        }
                        placeCaret(ctx.li, true);
                    }
                }
                return;
            }

            if (type === 'check') {
                const checkItem = document.createElement('div');
                checkItem.className = 'checklist-item';
                const existingP = node.closest('p');
                const text = existingP?.innerHTML || node.textContent || '';
                checkItem.innerHTML = `<input type="checkbox" class="checklist-checkbox"><div>${text || '\u200B'}</div>`;
                if (existingP) existingP.replaceWith(checkItem);
                else contentEditor.appendChild(checkItem);
                placeCaret(checkItem.querySelector('div'), true);
            } else {
                document.execCommand(type === 'number' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                if (type === 'dash') {
                    const ctx = getListContext();
                    if (ctx.list) ctx.list.style.listStyleType = '"- "';
                }
            }
        };

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
            });
        });

        const monoBtn = document.getElementById('notes-mono-btn');
        if (monoBtn) {
            monoBtn.addEventListener('click', () => {
                const isMono = document.queryCommandValue('fontName').includes('monospace');
                document.execCommand('fontName', false, isMono ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : 'monospace');
                contentEditor.focus();
            });
        }

        const dashBtn = document.getElementById('notes-dash-btn');
        if (dashBtn) {
            dashBtn.addEventListener('click', () => { applyListType('dash'); contentEditor.focus(); updateToolbar(); });
        }

        const updateToolbar = () => {
            const isReadOnly = document.getElementById('panel-note-view')?.classList.contains('note-view-readonly');
            const activeElement = document.activeElement;
            const isTitleFocused = activeElement && (activeElement.id === 'active-note-title' || activeElement.closest('#active-note-title'));
            const toolbar = document.querySelectorAll('.notes-toolbar-btn, .toolbar-divider');

            if (isTitleFocused) {
                if (toolbar) {
                    toolbar.style.opacity = '0.35';
                    toolbar.style.pointerEvents = 'none';
                }
                return;
            } else {
                toolbar.forEach(el => {
                    el.style.opacity = isReadOnly ? '0.35' : '1';
                    el.style.pointerEvents = isReadOnly ? 'none' : 'auto';
                });
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
                    const isDashedUl = cmd === 'insertUnorderedList' && isDashed;
                    btn.classList.toggle('active', state && !isDashedUl);
                }
            });

            const isMono = document.queryCommandValue('fontName').includes('monospace');
            document.getElementById('notes-mono-btn')?.classList.toggle('active', isMono);
            document.getElementById('notes-dash-btn')?.classList.toggle('active', isDashed);
        };

        document.addEventListener('selectionchange', updateToolbar);
        titleEditor.addEventListener('focus', updateToolbar);
        titleEditor.addEventListener('blur', updateToolbar);
        contentEditor.addEventListener('focus', updateToolbar);

        const createNewNote = () => {
            const id = 'note-' + Date.now();
            notesData[id] = {
                title: 'New Note',
                folder: (currentFolder === 'all' || currentFolder === 'recently_deleted') ? 'all' : currentFolder,
                lastEdited: Date.now(),
                content: '<p></p>',
                pinned: false
            };
            saveNotes();
            renderNotesList(currentFolder, true);
            const item = document.querySelector(`.note-preview[data-note-id="${id}"]`);
            if (item) item.click();
            setNoteViewReadOnly(false);
            setTimeout(() => {
                const tEd = document.getElementById('active-note-title');
                if (tEd) { tEd.focus(); document.execCommand('selectAll', false, null); }
            }, 500);
        };

        ['new-note-btn-header', 'new-note-btn-mobile'].forEach(id =>
            document.getElementById(id)?.addEventListener('click', createNewNote)
        );
        document.getElementById('new-folder-btn-top')?.addEventListener('click', createFolder);
        openFolderContextMenu = (e, folderName, targetKey) => {
            const menu = contextMenu(e, 'folder-context-menu');
            const folderRow = targetKey ? document.querySelector(`[data-target="${targetKey}"]`) : null;
            const isCustom = !!(folderRow?.classList.contains('custom')) || customFolders.includes(folderName);

            if (isCustom) {
                const renameBtn = document.createElement('div');
                renameBtn.className = 'note-context-item';
                renameBtn.innerText = 'Rename Folder';
                renameBtn.onclick = () => {
                    const newName = prompt('Enter new folder name:', folderName);
                    const trimmedNewName = newName ? newName.trim() : '';
                    if (!trimmedNewName || trimmedNewName === folderName) return;
                    const allFolderNames = Object.values(folderMap);
                    if (allFolderNames.includes(trimmedNewName)) {
                        alert('A folder with that name already exists.');
                        return;
                    }

                    const oldKey = `panel-notes-${slugify(folderName)}`;
                    const newKey = `panel-notes-${slugify(trimmedNewName)}`;

                    Object.values(notesData).forEach(note => {
                        if (note.folder === folderName) note.folder = trimmedNewName;
                    });

                    if (isCustom) {
                        customFolders = customFolders.map(n => n === folderName ? trimmedNewName : n);
                        localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
                    }

                    if (folderMap[oldKey]) delete folderMap[oldKey];
                    folderMap[newKey] = trimmedNewName;

                    if (!isCustom && targetKey) {
                        const folderEl = document.querySelector(`[data-target="${targetKey}"]`);
                        if (folderEl) {
                            folderEl.setAttribute('data-target', newKey);
                            const infoDiv = folderEl.querySelector('.notes-folder-info');
                            if (infoDiv) {
                                Array.from(infoDiv.childNodes).forEach(node => {
                                    if (node.nodeType === Node.TEXT_NODE) node.remove();
                                });
                                infoDiv.appendChild(document.createTextNode(trimmedNewName));
                            }
                        }
                        delete folderMap[targetKey];
                    }

                    currentFolder = trimmedNewName;

                    saveNotes();
                    renderFolderList();
                    renderNotesList(trimmedNewName);
                    menu.remove();
                };

                menu.appendChild(separator());

                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'note-context-item';
                deleteBtn.style.color = '#FF453A';
                deleteBtn.innerText = 'Delete Folder';
                deleteBtn.onclick = () => {
                    if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) return;
                    const folderKey = targetKey || `panel-notes-${slugify(folderName)}`;

                    if (isCustom) {
                        customFolders = customFolders.filter(n => n !== folderName);
                        localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
                    } else {
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
                    menu.remove();
                };

                menu.appendChild(renameBtn);
                menu.appendChild(separator());
                menu.appendChild(deleteBtn);
            } else {
                const info = document.createElement('div');
                info.className = 'note-context-item';
                info.style.color = '#999';
                info.innerText = 'Read-only folder';
                menu.appendChild(info);
            }

            document.body.appendChild(menu);
            closeOnOutside(menu);
        };

        bindFolderClicks = () => {
            document.querySelectorAll('.folder-list-item').forEach(item => {
                const getTargetAndName = () => {
                    const target = item.getAttribute('data-target');
                    const name = (target && Object.prototype.hasOwnProperty.call(folderMap, target))
                        ? folderMap[target]
                        : item.querySelector('.notes-folder-info')?.lastChild?.textContent?.trim() || item.textContent.trim();
                    return { target, name };
                };

                item.onclick = (e) => {
                    e.stopPropagation();
                    currentFolder = getTargetAndName().name;
                    document.querySelectorAll('.notes-list-item').forEach(n => n.classList.remove('active-folder'));
                    item.classList.add('active-folder');
                    navigateTo('notes');
                    setTimeout(() => {
                        const firstNote = document.querySelector('.note-preview');
                        if (firstNote && window.innerWidth >= 800) firstNote.click();
                    }, 50);
                };

                let folderPressTimer;
                const clearFolderPressTimer = () => { clearTimeout(folderPressTimer); folderPressTimer = null; };

                item.onpointerdown = (e) => {
                    folderPressTimer = setTimeout(() => {
                        const { target, name } = getTargetAndName();
                        openFolderContextMenu(e, name, target);
                    }, 500);
                };
                item.onpointerup = clearFolderPressTimer;
                item.onpointerleave = clearFolderPressTimer;
                item.onpointercancel = clearFolderPressTimer;

                item.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const { target, name } = getTargetAndName();
                    openFolderContextMenu(e, name, target);
                };
            });
        };

        bindFolderClicks();
    }

    if (notesModal && notesBackdrop) {
        let isMinimized = false;

        const openNotes = () => {
            document.body.style.overflow = 'hidden';

            const wasMinimized = isMinimized;

            notesBackdrop.classList.add('visible');

            if (wasMinimized) {
                let restoreLeft = savedPositionLeft ? parseFloat(savedPositionLeft) : (window.innerWidth - 950) / 2;
                let restoreTop = savedPositionTop ? parseFloat(savedPositionTop) : (window.innerHeight - 600) / 2;

                const miniRect = notesModal.getBoundingClientRect();
                const miniCX = miniRect.left + miniRect.width / 2;
                const miniCY = miniRect.top + miniRect.height / 2;
                const restoreCX = restoreLeft + 950 / 2;
                const restoreCY = restoreTop + 600 / 2;

                const originX = miniCX < restoreCX ? 'left' : 'right';
                const originY = miniCY < restoreCY ? 'top' : 'bottom';

                notesModal.classList.remove('minimized');
                notesModal.classList.add('visible');

                notesModal.style.transition = 'none';
                notesModal.style.left = `${miniRect.left}px`;
                notesModal.style.top = `${miniRect.top}px`;
                notesModal.style.transformOrigin = `${originY} ${originX}`;
                notesModal.style.transform = 'scale(0.3)';
                if (savedResizeWidth && savedResizeHeight) {
                    notesModal.style.width = savedResizeWidth;
                    notesModal.style.height = savedResizeHeight;
                } else {
                    notesModal.style.removeProperty('width');
                    notesModal.style.removeProperty('height');
                }

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        notesModal.style.transition = 'transform .4s cubic-bezier(.25, 1, .5, 1), left .4s cubic-bezier(.25, 1, .5, 1), top .4s cubic-bezier(.25, 1, .5, 1), width .4s cubic-bezier(.25, 1, .5, 1), height .4s cubic-bezier(.25, 1, .5, 1)';
                        notesModal.style.left = `${restoreLeft}px`;
                        notesModal.style.top = `${restoreTop}px`;
                        notesModal.style.transform = 'scale(1)';
                    });
                });

                setTimeout(() => {
                    ['transition', 'transform', 'transform-origin'].forEach(p => notesModal.style.removeProperty(p));
                    savedPositionLeft = savedPositionTop = savedResizeWidth = savedResizeHeight = null;
                }, 450);
            } else {
                notesModal.classList.remove('minimized');
                notesModal.classList.add('visible');
            }

            isMinimized = false;

            currentFolder = 'all';
            renderFolderList();

            document.querySelectorAll('[data-target]').forEach(f => f.classList.remove('active-folder'));
            document.querySelector('[data-target="panel-notes-all"]')?.classList.add('active-folder');

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
            savedResizeWidth = null;
            savedResizeHeight = null;
            savedPositionLeft = null;
            savedPositionTop = null;

            setTimeout(() => {
                ['transform', 'transition', 'transform-origin', 'left', 'top', 'width', 'height']
                    .forEach(p => notesModal.style.removeProperty(p));
            }, 400);
        };

        const minimizeNotes = (e) => {
            if (window.innerWidth < 800) {
                closeNotes(e);
                return;
            }
            document.body.style.overflow = 'hidden';
            if (e && e.stopPropagation) e.stopPropagation();

            const rect = notesModal.getBoundingClientRect();
            const scale = 0.3;
            const miniLeft = rect.left + rect.width * (1 - scale) / 2;
            const miniTop = rect.top + rect.height * (1 - scale) / 2;

            savedPositionLeft = `${rect.left}px`;
            savedPositionTop = `${rect.top}px`;

            const curW = notesModal.style.getPropertyValue('width');
            const curH = notesModal.style.getPropertyValue('height');
            savedResizeWidth = curW || null;
            savedResizeHeight = curH || null;

            notesModal.style.removeProperty('width');
            notesModal.style.removeProperty('height');
            notesModal.style.transition = 'transform .4s cubic-bezier(.25, 1, .5, 1), left .4s cubic-bezier(.25, 1, .5, 1), top .4s cubic-bezier(.25, 1, .5, 1)';
            notesModal.style.left = `${rect.left}px`;
            notesModal.style.top = `${rect.top}px`;
            notesModal.style.transform = 'scale(1)';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    notesModal.style.left = `${miniLeft}px`;
                    notesModal.style.top = `${miniTop}px`;
                    notesModal.style.transform = `scale(${scale})`;
                });
            });

            notesBackdrop.classList.remove('visible');
            notesModal.classList.add('minimized');
            notesModal.classList.remove('fullscreen');
            isMinimized = true;

            setTimeout(() => {
                ['transition', 'left', 'top', 'transform', 'transform-origin'].forEach(p => notesModal.style.removeProperty(p));
            }, 450);
        };

        const maximizeNotes = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            if (notesModal.classList.contains('fullscreen')) {
                if (window.innerWidth < 800) { notesModal.classList.remove('fullscreen'); return; }
                notesModal.style.transition = 'none';
                notesModal.classList.remove('fullscreen');
                [['left', savedPositionLeft], ['top', savedPositionTop], ['width', savedResizeWidth], ['height', savedResizeHeight]].forEach(([prop, val]) => {
                    if (val) notesModal.style.setProperty(prop, val, 'important');
                });
                savedPositionLeft = savedPositionTop = savedResizeWidth = savedResizeHeight = null;
                setTimeout(() => notesModal.style.removeProperty('transition'), 50);
            } else {
                const rect = notesModal.getBoundingClientRect();
                savedPositionLeft = `${rect.left}px`;
                savedPositionTop = `${rect.top}px`;
                savedResizeWidth = notesModal.style.getPropertyValue('width') || null;
                savedResizeHeight = notesModal.style.getPropertyValue('height') || null;
                notesModal.style.removeProperty('left');
                notesModal.style.removeProperty('top');
                notesModal.style.removeProperty('width');
                notesModal.style.removeProperty('height');
                notesModal.classList.add('fullscreen');
            }
        };

        notesModal.addEventListener('click', (e) => {
            if (isMinimized && !hasDragged) {
                openNotes();
            }
        });

        const titleText = document.getElementById('title-text');
        if (titleText) {
            titleText.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;
                if (!notesModal.classList.contains('visible')) {
                    openNotes();
                }
            });
            titleText.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !notesModal.classList.contains('visible')) {
                    e.preventDefault();
                    openNotes();
                }
            });
        }

        notesBackdrop.addEventListener('click', closeNotes);

        document.querySelectorAll('.mac-close').forEach(btn => btn.addEventListener('click', closeNotes));

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
            if (notesModal.classList.contains('minimized')) return;

            const isDesktop = window.innerWidth >= 800;

            if (isDesktop && e.target.closest('.notes-header')) return;
            if (e.target.closest('.resize-handle')) return;

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
                const closeAfterSlide = () => {
                    notesModal.removeEventListener('transitionend', closeAfterSlide);
                    closeNotes();
                };
                notesModal.addEventListener('transitionend', closeAfterSlide);
                notesModal.style.setProperty('transition', 'transform .35s cubic-bezier(.25, 1, .5, 1)', 'important');
                notesModal.style.setProperty('transform', `translateY(${window.innerHeight}px)`, 'important');
            } else if (diff > 5 && window.innerWidth < 800) {
                notesModal.style.setProperty('transform', 'translateY(0)', 'important');
                clearTimeout(window._mobileDragReset);
                window._mobileDragReset = setTimeout(() => notesModal.style.removeProperty('transform'), 400);
            }
        };

        let minDragging = false;
        let mainDragging = false;
        let hasDragged = false;
        let modalOffsetX, modalOffsetY;
        let startDragX, startDragY;

        const minimizedScale = 0.3;
        const minimizedOffsetX = 950 * (1 - minimizedScale) / 2;
        const minimizedOffsetY = 600 * (1 - minimizedScale) / 2;

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
            if (isHeader) e.preventDefault();
        };

        const handleDragMove = (e) => {
            if (!minDragging && !mainDragging) return;
            const event = e.type.includes('touch') ? e.touches[0] : e;

            if (Math.abs(event.clientX - startDragX) > 5 || Math.abs(event.clientY - startDragY) > 5) {
                hasDragged = true;
            }

            let x = event.clientX - modalOffsetX;
            let y = event.clientY - modalOffsetY;

            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const rect = notesModal.getBoundingClientRect();

            x = Math.max(0, Math.min(x, winW - rect.width));
            y = Math.max(0, Math.min(y, winH - rect.height));

            if (minDragging) {
                notesModal.style.setProperty('left', `${x - minimizedOffsetX}px`, 'important');
                notesModal.style.setProperty('top', `${y - minimizedOffsetY}px`, 'important');
            } else {
                notesModal.style.setProperty('left', `${x}px`, 'important');
                notesModal.style.setProperty('top', `${y}px`, 'important');
                notesModal.style.setProperty('transform', 'none', 'important');
            }
        };

        const handleDragEnd = (forceSnap = false) => {
            if (!minDragging && !mainDragging && !forceSnap) return;

            const wasMin = minDragging || (forceSnap && notesModal.classList.contains('minimized'));
            minDragging = false;
            mainDragging = false;

            if (wasMin && !hasDragged && !forceSnap) {
                notesModal.style.transition = '';
                return;
            }

            notesModal.style.transition = '';

            if (wasMin) {
                const rect = notesModal.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const winW = window.innerWidth;
                const winH = window.innerHeight;

                let snapX, snapY;
                if (centerX < winW / 2) snapX = 20;
                else snapX = winW - rect.width - 20;

                if (centerY < winH / 2) snapY = 20;
                else snapY = winH - rect.height - 20;

                notesModal.style.setProperty('left', `${snapX - minimizedOffsetX}px`, 'important');
                notesModal.style.setProperty('top', `${snapY - minimizedOffsetY}px`, 'important');
            }
        };

        let isResizing = false;
        let resizeDir = '';
        let resizeStartX, resizeStartY;
        let resizeStartRect;
        const RESIZE_MIN_W = 700;
        const RESIZE_MIN_H = 400;
        let savedResizeWidth = null;
        let savedResizeHeight = null;
        let savedPositionLeft = null;
        let savedPositionTop = null;

        const handleResizeStart = (e) => {
            if (notesModal.classList.contains('minimized') || notesModal.classList.contains('fullscreen')) return;
            const handle = e.target.closest('.resize-handle');
            if (!handle) return;

            isResizing = true;
            resizeDir = handle.dataset.dir;
            const event = e.type.includes('touch') ? e.touches[0] : e;
            resizeStartX = event.clientX;
            resizeStartY = event.clientY;
            resizeStartRect = notesModal.getBoundingClientRect();

            notesModal.style.transition = 'none';
            e.preventDefault();
            e.stopPropagation();
        };

        const handleResizeMove = (e) => {
            if (!isResizing) return;
            const event = e.type.includes('touch') ? e.touches[0] : e;
            const dx = event.clientX - resizeStartX;
            const dy = event.clientY - resizeStartY;

            let newW = resizeStartRect.width;
            let newH = resizeStartRect.height;
            let newL = resizeStartRect.left;
            let newT = resizeStartRect.top;

            if (resizeDir.includes('e')) {
                newW = Math.max(RESIZE_MIN_W, Math.min(resizeStartRect.width + dx, window.innerWidth));
            }
            if (resizeDir.includes('w')) {
                const candidateW = resizeStartRect.width - dx;
                newW = Math.max(RESIZE_MIN_W, candidateW);
                newL = resizeStartRect.left + (candidateW >= RESIZE_MIN_W ? dx : resizeStartRect.width - RESIZE_MIN_W);
            }
            if (resizeDir.includes('s')) {
                newH = Math.max(RESIZE_MIN_H, Math.min(resizeStartRect.height + dy, window.innerHeight));
            }
            if (resizeDir.includes('n')) {
                const candidateH = resizeStartRect.height - dy;
                newH = Math.max(RESIZE_MIN_H, candidateH);
                newT = resizeStartRect.top + (candidateH >= RESIZE_MIN_H ? dy : resizeStartRect.height - RESIZE_MIN_H);
            }

            notesModal.style.setProperty('width', `${newW}px`, 'important');
            notesModal.style.setProperty('height', `${newH}px`, 'important');
            notesModal.style.setProperty('left', `${newL}px`, 'important');
            notesModal.style.setProperty('top', `${newT}px`, 'important');
            notesModal.style.setProperty('transform', 'none', 'important');

            const sidebarBtn = document.getElementById('sidebar-toggle');
            if (sidebarBtn) sidebarBtn.style.marginLeft = newW < 900 ? '70px' : '0px';
            panels.folders.classList.toggle('collapsed', newW < 900);
        };

        const handleResizeEnd = () => {
            if (!isResizing) return;
            isResizing = false;
            notesModal.style.transition = '';
        };

        const on = (el, ev, fn, opts) => el.addEventListener(ev, fn, opts);
        const onPair = (el, win, ev, fn, opts) => { on(el, ev, fn, opts); on(win, ev.replace('mouse', 'touch'), fn, opts); };

        if (window.innerWidth >= 800) {
            onPair(notesModal, window, 'mousedown', handleDragStart, { passive: true });
            onPair(window, window, 'mousemove', handleDragMove, { passive: false });
            onPair(window, window, 'mouseup', handleDragEnd);

            on(notesModal, 'mousedown', handleResizeStart);
            on(notesModal, 'touchstart', handleResizeStart, { passive: false });
            onPair(window, window, 'mousemove', handleResizeMove, { passive: false });
            onPair(window, window, 'mouseup', handleResizeEnd);
        }

        onPair(notesModal, window, 'mousedown', handleMobileDragStart, { passive: true });
        onPair(window, window, 'mousemove', handleMobileDragMove, { passive: false });
        onPair(window, window, 'mouseup', handleMobileDragEnd);

        document.querySelectorAll('.mac-min').forEach(btn => btn.addEventListener('click', minimizeNotes));
        document.querySelectorAll('.mac-max').forEach(btn => btn.addEventListener('click', maximizeNotes));

        document.querySelectorAll('[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('[data-target]').forEach(f => f.classList.remove('active-folder'));
                item.classList.add('active-folder');

                const target = e.currentTarget.getAttribute('data-target');
                currentFolder = folderMap[target] || 'all';

                renderNotesList(currentFolder);
                if (window.innerWidth >= 800) {
                    const firstNote = document.querySelector('.note-preview');
                    if (firstNote) firstNote.click();
                }
                navigateTo('notes', { skipListRender: true });
            });
        });

        const purgeDeleted = () => {
            const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
            const before = Object.keys(notesData).length;
            for (const id of Object.keys(notesData))
                if (notesData[id].folder === 'recently_deleted' && notesData[id].deletedAt < cutoff) delete notesData[id];
            if (Object.keys(notesData).length !== before) { saveNotes(); renderNotesList(currentFolder); }
        };
        setInterval(purgeDeleted, 60000);
        purgeDeleted();

        document.querySelectorAll('[data-back]').forEach(btn =>
            btn.addEventListener('click', (e) => navigateTo(e.currentTarget.getAttribute('data-back') === 'panel-folders' ? 'folders' : 'notes'))
        );

        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const isCollapsed = panels.folders.classList.toggle('collapsed');
                if (window.innerWidth >= 800) sidebarToggle.style.marginLeft = isCollapsed ? '70px' : '0px';
            });
        }
    }
});
