import { setupNotesEditor } from './controller';
import {
    closeOnOutside,
    contextMenu,
    separator,
    setupFolderController,
    type FolderController
} from './folder';
import { setupNotesWindow } from './window';
import {
    hydrateNotes,
    saveNotes as persistNotes,
    saveSeedPins as persistSeedPins,
    type NotesData
} from './storage';

document.addEventListener('DOMContentLoaded', () => {
    const notesModal = document.getElementById('notes-modal');
    const notesBackdrop = document.getElementById('notes-backdrop');

    const panels = {
        folders: document.getElementById('panel-folders')!,
        notes: document.getElementById('panel-notes')!,
        view: document.getElementById('panel-note-view')!
    };

    let lastSelectedIndex: number | null = null;

    let seedNoteIds = new Set<string>();
    const isBuiltInNoteId = (id: string): boolean => seedNoteIds.has(id);

    interface NavigateOptions {
        skipListRender?: boolean;
    }

    let folderController: FolderController;
    const navigateTo = (targetId: string, opts: NavigateOptions = {}): void => {
        Object.values(panels).forEach(p => {
            p.classList.remove('active', 'prev');
        });

        if (targetId === 'folders') {
            panels.folders.classList.add('active');
        } else if (targetId === 'notes' || folderController.resolveFolder(targetId)) {
            const filter = folderController.resolveFolder(targetId) || folderController.getCurrentFolder();
            folderController.setCurrentFolder(filter);
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

    let notesReady = false;
    const notesData: NotesData = {};

    const saveNotes = () => {
        persistNotes(notesData, seedNoteIds);
        folderController.updateCounts();
    };

    const saveSeedPins = () => persistSeedPins(notesData, seedNoteIds);

    const formatNoteDate = (timestamp: number | string | Date): string => {
        const now = new Date();
        const d = new Date(timestamp);
        if (now.toDateString() === d.toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' });

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';

        const diffDays: number = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });

        return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    const formatFullNoteDate = (timestamp: number | string | Date): string => {
        const d = new Date(timestamp);
        const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' });
        return `${dateStr} at ${timeStr}`;
    };

    const titleEditor = document.getElementById('active-note-title');
    const contentEditor = document.getElementById('active-note-content');
    const { displayNote, extractPreviewText } = setupNotesEditor({
        titleElement: titleEditor,
        contentElement: contentEditor,
        notesData,
        isBuiltInNoteId,
        saveNotes,
        refreshNotesList: () => renderNotesList(folderController.getCurrentFolder(), false),
        formatFullNoteDate
    });

    function renderNotesList(folderFilter: string = 'all', autoSelect: boolean = true): void {
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
            return Number(notesData[b].lastEdited) - Number(notesData[a].lastEdited);
        });

        if (prevSelection && filteredNotes.includes(prevSelection)) {
            selectionTarget = prevSelection;
        } else if (autoSelect && filteredNotes.length) {
            selectionTarget = filteredNotes[0];
        }

        let hasPinnedHeader = false;
        let hasNotesHeader = false;

        const listHeader = (text: string) => {
            const h = document.createElement('div');
            h.innerText = text;
            h.style.cssText = 'font-size:.875rem;user-select:none;font-weight:500;color:#8e8e93;padding:12px 16px 4px';
            return h;
        };

        const titleNode = document.getElementById('notes-header-title');
        if (titleNode) {
            const titles: Record<string, string> = { recently_deleted: 'Recently Deleted', all: 'All Notes'};
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

            const previewText = extractPreviewText(data.contentJson || data.content);

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

            let pressTimer: ReturnType<typeof setTimeout> | undefined;
            let isLongPress: boolean = false;;
            const clearTimer = () => {
                clearTimeout(pressTimer);
            };

            const handleNoteAction = (e: MouseEvent): void => {
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

                        const validTargets = folderController.getMoveTargets().filter(f => data.folder !== f);
                        if (validTargets.length > 0) {
                            validTargets.forEach(f => {
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
                        }

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

            const handleMultiNoteAction = (e: MouseEvent): void => {
                const selectedEls = document.querySelectorAll('.note-preview.selected');
                const selectedIds = Array.from(selectedEls)
                    .map(el => el.getAttribute('data-note-id'))
                    .filter((id): id is string => id !== null);

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
                    const selectedFolders = [...new Set(userSelectedIds.map(id => notesData[id].folder))];
                    const validTargets = folderController.getMoveTargets().filter(f => !selectedFolders.every(sf => sf === f));

                    if (validTargets.length > 0) {
                        menu.appendChild(separator());

                        validTargets.forEach(f => {
                            const mbtn = document.createElement('div');
                            mbtn.className = 'note-context-item';
                            mbtn.innerText = `Move ${userSelectedIds.length} Notes to ${f}`;
                            mbtn.onclick = () => {
                            userSelectedIds.forEach(id => {
                                notesData[id].folder = f;
                            });
                            saveNotes();
                            renderNotesList(folderFilter);
                            menu.remove();
                            };
                            menu.appendChild(mbtn);
                        });

                        menu.appendChild(separator());
                    }

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

    folderController = setupFolderController({
        notesData,
        saveNotes,
        renderNotesList,
        navigateTo
    });

    seedNoteIds = new Set(Object.keys(notesData));
    hydrateNotes(notesData, seedNoteIds);
    notesReady = true;
    folderController.updateCounts();
    folderController.renderFolderList();

    if (titleEditor && contentEditor) {
        const createNewNote = () => {
            const id = 'note-' + Date.now();
            const currentFolder = folderController.getCurrentFolder();
            notesData[id] = {
                title: 'New Note',
                folder: (currentFolder === 'all' || currentFolder === 'recently_deleted')
                    ? 'all'
                    : currentFolder,
                lastEdited: Date.now(),
                content: '<p></p>',
                contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
                pinned: false
            };
            saveNotes();
            renderNotesList(currentFolder, true);
            const item = document.querySelector<HTMLElement>(`.note-preview[data-note-id="${id}"]`);
            if (item) item.click();
            setTimeout(() => {
                const tEd = document.getElementById('active-note-title');
                if (tEd) {
                    tEd.focus();
                    document.execCommand('selectAll', false, undefined); 
                }
            }, 500);
        };

        ['new-note-btn-header', 'new-note-btn-mobile'].forEach(id =>
            document.getElementById(id)?.addEventListener('click', createNewNote)
        );
        folderController.initializeInteractions();
    }

    if (notesModal && notesBackdrop) {
        setupNotesWindow({
            notesModal,
            notesBackdrop,
            panels: { folders: panels.folders! },
            renderFolderList: folderController.renderFolderList,
            renderNotesList,
            setCurrentFolder: folderController.setCurrentFolder,
            navigateTo
        });

        folderController.bindFolderNavigation();

        const purgeDeleted = () => {
            const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
            const before = Object.keys(notesData).length;
            for (const id of Object.keys(notesData)) {
                const note = notesData[id];
                if (note?.folder === 'recently_deleted' && note.deletedAt !== undefined && note.deletedAt < cutoff) {
                    delete notesData[id];
                }
            }
            if (Object.keys(notesData).length !== before) { saveNotes(); renderNotesList(folderController.getCurrentFolder()); }
        };
        setInterval(purgeDeleted, 60000);
        purgeDeleted();

        document.querySelectorAll<HTMLElement>('[data-back]').forEach((btn) => {
            btn.addEventListener('click', (e: MouseEvent) => {
                const target = e.currentTarget as HTMLElement | null;
                const destination = target?.getAttribute('data-back') === 'panel-folders' ? 'folders' : 'notes';
                navigateTo(destination);
            });
        });

        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const isCollapsed = panels.folders.classList.toggle('collapsed');
                if (window.innerWidth >= 800) sidebarToggle.style.marginLeft = isCollapsed ? '70px' : '0px';
            });
        }
    }
});
