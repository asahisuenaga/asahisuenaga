import type { NotesData } from './storage';

const CUSTOM_FOLDER_KEY = 'apple_notes_custom_folders';

interface FolderControllerOptions {
    notesData: NotesData;
    saveNotes: () => void;
    renderNotesList: (folder: string, autoSelect?: boolean) => void;
    navigateTo: (targetId: string, opts?: { skipListRender?: boolean }) => void;
}

export interface FolderController {
    bindFolderNavigation: () => void;
    initializeInteractions: () => void;
    getCurrentFolder: () => string;
    getMoveTargets: () => string[];
    renderFolderList: () => void;
    resolveFolder: (targetId: string) => string | undefined;
    setCurrentFolder: (folder: string) => void;
    updateCounts: () => void;
}

export const separator = (): HTMLDivElement => {
    const element = document.createElement('div');
    element.className = 'context-separator';
    element.style.cssText = 'height:.0625rem;background:rgba(0,0,0,.1);margin:4px 0';
    return element;
};

export const contextMenu = (event: MouseEvent, id: string | number): HTMLDivElement => {
    const idString = String(id);
    document.getElementById(idString)?.remove();

    const menu = document.createElement('div');
    menu.id = idString;
    menu.className = 'note-context-menu';
    document.body.appendChild(menu);

    constrainMenuToViewport(menu, (event.clientX || 0) - 10, (event.clientY || 0) - 10);
    return menu;
};

export const closeOnOutside = (menu: HTMLElement): void => {
    const close = (event: PointerEvent): void => {
        if (event.button === 2) return;
        if (menu.contains(event.target as Node | null)) return;

        menu.remove();
        document.removeEventListener('pointerdown', close, true);
    };
    setTimeout(() => document.addEventListener('pointerdown', close, true), 10);
};

const constrainMenuToViewport = (menu: HTMLElement, x: number, y: number): void => {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    setTimeout(() => {
        const { width, height } = menu.getBoundingClientRect();
        const padding = 10;
        const clamp = (value: number, max: number): number =>
            Math.max(padding, Math.min(value, max - width - padding));

        if (x + width > window.innerWidth - padding || x < padding) {
            menu.style.left = `${clamp(x, window.innerWidth)}px`;
        }
        if (y + height > window.innerHeight - padding || y < padding) {
            menu.style.top = `${clamp(y, window.innerHeight)}px`;
        }
    }, 0);
};

const slugify = (name: string): string =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

export const setupFolderController = ({
    notesData,
    saveNotes,
    renderNotesList,
    navigateTo
}: FolderControllerOptions): FolderController => {
    let customFolders: string[] = JSON.parse(localStorage.getItem(CUSTOM_FOLDER_KEY) || '[]');
    let currentFolder = 'all';
    const folderMap: Record<string, string> = {
        'panel-notes-all': 'all',
        'panel-notes-deleted': 'recently_deleted'
    };
    const folderGroup = document.querySelector('.notes-list-group');

    const getMoveTargets = (): string[] =>
        [...new Set([...Object.values(folderMap), ...customFolders])]
            .filter(folder => folder && folder !== 'recently_deleted' && folder !== 'all');

    const updateCounts = (): void => {
        const counts: Record<string, number> = { all: 0, recently_deleted: 0 };
        Object.values(notesData).forEach(note => {
            if (note.folder === 'recently_deleted') {
                counts.recently_deleted++;
                return;
            }
            counts.all++;
            if (note.folder && note.folder !== 'all' && note.folder !== 'recently_deleted') {
                counts[note.folder] = (counts[note.folder] || 0) + 1;
            }
        });

        const countIds = { 'count-all': counts.all, 'count-deleted': counts.recently_deleted };
        Object.entries(countIds).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.innerText = String(value);
        });

        customFolders.forEach(name => {
            const element = document.getElementById(`count-panel-notes-${slugify(name)}`);
            if (element) element.innerText = String(counts[name] || 0);
        });
    };

    const bindFolderClicks = (): void => {
        document.querySelectorAll<HTMLElement>('.folder-list-item').forEach(item => {
            const getTargetAndName = (): { target: string | null; name: string } => {
                const target = item.getAttribute('data-target');
                const name = target && Object.prototype.hasOwnProperty.call(folderMap, target)
                    ? folderMap[target]
                    : item.querySelector('.notes-folder-info')?.lastChild?.textContent?.trim() || item.textContent.trim();
                return { target, name };
            };

            item.onclick = event => {
                event.stopPropagation();
                currentFolder = getTargetAndName().name;
                document.querySelectorAll('.notes-list-item').forEach(note => note.classList.remove('active-folder'));
                item.classList.add('active-folder');
                navigateTo('notes');
                setTimeout(() => {
                    const firstNote = document.querySelector<HTMLElement>('.note-preview');
                    if (firstNote && window.innerWidth >= 800) firstNote.click();
                }, 50);
            };

            let folderPressTimer: ReturnType<typeof setTimeout> | null = null;
            const clearFolderPressTimer = (): void => {
                if (folderPressTimer !== null) clearTimeout(folderPressTimer);
                folderPressTimer = null;
            };

            item.onpointerdown = event => {
                folderPressTimer = setTimeout(() => {
                    const { target, name } = getTargetAndName();
                    openFolderContextMenu(event, name, target);
                }, 500);
            };
            item.onpointerup = clearFolderPressTimer;
            item.onpointerleave = clearFolderPressTimer;
            item.onpointercancel = clearFolderPressTimer;

            item.oncontextmenu = event => {
                event.preventDefault();
                event.stopPropagation();
                const { target, name } = getTargetAndName();
                openFolderContextMenu(event, name, target);
            };
        });
    };

    const renderFolderList = (): void => {
        if (!folderGroup) return;

        folderGroup.querySelectorAll('.folder-list-item.custom').forEach(element => element.remove());
        const divider = folderGroup.querySelector('div[style*="height: .0625rem"]');

        customFolders.forEach(folderName => {
            const folderKey = `panel-notes-${slugify(folderName)}`;
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

    const createFolder = (): void => {
        const folderName = prompt('Enter new folder name:');
        if (!folderName) return;
        if (['All Notes', 'Recently Deleted'].includes(folderName)) {
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

    const openFolderContextMenu = (event: MouseEvent, folderName: string, targetKey: string | null): void => {
        const menu = contextMenu(event, 'folder-context-menu');
        const folderRow = targetKey ? document.querySelector(`[data-target="${targetKey}"]`) : null;
        const isCustom = !!folderRow?.classList.contains('custom') || customFolders.includes(folderName);

        if (isCustom) {
            const renameButton = document.createElement('div');
            renameButton.className = 'note-context-item';
            renameButton.innerText = 'Rename Folder';
            renameButton.onclick = () => {
                const newName = prompt('Enter new folder name:', folderName);
                const trimmedNewName = newName ? newName.trim() : '';
                if (!trimmedNewName || trimmedNewName === folderName) return;
                if (Object.values(folderMap).includes(trimmedNewName)) {
                    alert('A folder with that name already exists.');
                    return;
                }

                const oldKey = `panel-notes-${slugify(folderName)}`;
                const newKey = `panel-notes-${slugify(trimmedNewName)}`;
                Object.values(notesData).forEach(note => {
                    if (note.folder === folderName) note.folder = trimmedNewName;
                });

                if (isCustom) {
                    customFolders = customFolders.map(name => name === folderName ? trimmedNewName : name);
                    localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
                }

                if (folderMap[oldKey]) delete folderMap[oldKey];
                folderMap[newKey] = trimmedNewName;

                if (!isCustom && targetKey) {
                    const folderElement = document.querySelector(`[data-target="${targetKey}"]`);
                    if (folderElement) {
                        folderElement.setAttribute('data-target', newKey);
                        const info = folderElement.querySelector('.notes-folder-info');
                        if (info) {
                            Array.from(info.childNodes).forEach(node => {
                                if (node.nodeType === Node.TEXT_NODE) node.remove();
                            });
                            info.appendChild(document.createTextNode(trimmedNewName));
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

            const deleteButton = document.createElement('div');
            deleteButton.className = 'note-context-item';
            deleteButton.style.color = '#FF453A';
            deleteButton.innerText = 'Delete Folder';
            deleteButton.onclick = () => {
                if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) return;
                const folderKey = targetKey || `panel-notes-${slugify(folderName)}`;

                if (isCustom) {
                    customFolders = customFolders.filter(name => name !== folderName);
                    localStorage.setItem(CUSTOM_FOLDER_KEY, JSON.stringify(customFolders));
                } else {
                    document.querySelector(`[data-target="${folderKey}"]`)?.remove();
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

            menu.appendChild(renameButton);
            menu.appendChild(separator());
            menu.appendChild(deleteButton);
        } else {
            const infoText = document.createElement('div');
            infoText.className = 'note-context-item disabled';
            infoText.style.pointerEvents = 'none';
            infoText.innerText = 'Default folders cannot be renamed';
            menu.appendChild(infoText);
        }

        document.body.appendChild(menu);
        closeOnOutside(menu);
    };

    const bindFolderNavigation = (): void => {
        document.querySelectorAll<HTMLElement>('[data-target]').forEach(item => {
            item.addEventListener('click', event => {
                document.querySelectorAll<HTMLElement>('[data-target]').forEach(folder => folder.classList.remove('active-folder'));
                item.classList.add('active-folder');

                const target = (event.currentTarget as HTMLElement).getAttribute('data-target');
                currentFolder = (target && folderMap[target]) || 'all';
                renderNotesList(currentFolder);
                if (window.innerWidth >= 800) {
                    const firstNote = document.querySelector<HTMLElement>('.note-preview');
                    if (firstNote) firstNote.click();
                }
                navigateTo('notes', { skipListRender: true });
            });
        });
    };

    return {
        bindFolderNavigation,
        initializeInteractions: () => {
            document.getElementById('new-folder-btn-top')?.addEventListener('click', createFolder);
            bindFolderClicks();
        },
        getCurrentFolder: () => currentFolder,
        getMoveTargets,
        renderFolderList,
        resolveFolder: targetId => folderMap[targetId],
        setCurrentFolder: folder => { currentFolder = folder; },
        updateCounts
    };
};
