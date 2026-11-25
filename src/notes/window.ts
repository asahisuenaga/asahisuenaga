interface NotesWindowOptions {
    notesModal: HTMLElement;
    notesBackdrop: HTMLElement;
    panels: { folders: HTMLElement };
    renderFolderList: () => void;
    renderNotesList: (folder: string, autoSelect?: boolean) => void;
    setCurrentFolder: (folder: string) => void;
    navigateTo: (targetId: string, opts?: { skipListRender?: boolean }) => void;
}

export const setupNotesWindow = ({
    notesModal,
    notesBackdrop,
    panels,
    renderFolderList,
    renderNotesList,
    setCurrentFolder,
    navigateTo
}: NotesWindowOptions): void => {
    let isMinimized = false;
    let mobileDragReset: ReturnType<typeof setTimeout> | null = null;

    const openNotes = () => {
        document.body.style.overflow = 'hidden';

        const wasMinimized = isMinimized;

        notesBackdrop.classList.add('visible');

        if (wasMinimized) {
            const restoreLeft = savedPositionLeft ? parseFloat(savedPositionLeft) : (window.innerWidth - 950) / 2;
            const restoreTop = savedPositionTop ? parseFloat(savedPositionTop) : (window.innerHeight - 600) / 2;

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
            notesModal.style.transform = 'scale(.3)';
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

        setCurrentFolder('all');
        renderFolderList();

        document.querySelectorAll('[data-target]').forEach(f => f.classList.remove('active-folder'));
        document.querySelector('[data-target="panel-notes-all"]')?.classList.add('active-folder');

        renderNotesList('all');
        navigateTo('notes', { skipListRender: true });
    };

    const closeNotes = (e?: Event): void => {
        document.body.style.overflow = '';
        e?.stopPropagation();

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

    const minimizeNotes = (e: MouseEvent | TouchEvent): void => {
        if (window.innerWidth < 800) {
            closeNotes(e);
            return;
        }
        document.body.style.overflow = 'hidden';
        if (e && e.stopPropagation) e.stopPropagation();

        const rect = notesModal.getBoundingClientRect();
        const scale = .3;
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

    const maximizeNotes = (e: MouseEvent): void => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (notesModal.classList.contains('fullscreen')) {
            if (window.innerWidth < 800) { notesModal.classList.remove('fullscreen'); return; }
            notesModal.style.transition = 'none';
            notesModal.classList.remove('fullscreen');
            if (savedPositionLeft) notesModal.style.setProperty('left', savedPositionLeft, 'important');
            if (savedPositionTop) notesModal.style.setProperty('top', savedPositionTop, 'important');
            if (savedResizeWidth) notesModal.style.setProperty('width', savedResizeWidth, 'important');
            if (savedResizeHeight) notesModal.style.setProperty('height', savedResizeHeight, 'important');
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

    const openBtn = document.getElementById('open-btn');
    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            if (e.target instanceof Element && e.target.closest('a')) return;
            if (!notesModal.classList.contains('visible')) {
                openNotes();
            }
        });
        openBtn.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !notesModal.classList.contains('visible')) {
                e.preventDefault();
                openNotes();
            }
        });
    }

    notesBackdrop.addEventListener('click', closeNotes);

    document.querySelectorAll<HTMLElement>('.mac-close').forEach(btn => btn.addEventListener('click', closeNotes));

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    function findScrollableAncestor(el: Element | null, root: Element): Element | null {
        while (el && el !== root) {
            const style = getComputedStyle(el);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    const handleMobileDragStart = (e: MouseEvent | TouchEvent): void => {
        if (notesModal.classList.contains('minimized')) return;

        const isDesktop = window.innerWidth >= 800;
        const target = e.target;
        if (!(target instanceof Element)) return;

        if (isDesktop && target.closest('.notes-header')) return;
        if (target.closest('.resize-handle')) return;

        const scrollable = findScrollableAncestor(target, notesModal);
        if (scrollable && scrollable.scrollTop > 0) return;

        currentY = 0;
        if ('touches' in e) {
            const touch = e.touches.item(0);
            if (!touch) return;
            startY = touch.clientY;
        } else {
            startY = e.clientY;
        }
        currentY = startY;
        isDragging = true;
        notesModal.style.setProperty('transition', 'none', 'important');
        if (mobileDragReset !== null) clearTimeout(mobileDragReset);
        e.stopPropagation();
    };

    const handleMobileDragMove = (e: MouseEvent | TouchEvent): void => {
        if (!isDragging) return;
        if ('touches' in e) {
            const touch = e.touches.item(0);
            if (!touch) return;
            currentY = touch.clientY;
        } else {
            currentY = e.clientY;
        }
        const diff = currentY - startY;
        if (diff > 0) {
            if (e.cancelable) e.preventDefault();
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
            if (mobileDragReset !== null) clearTimeout(mobileDragReset);
            mobileDragReset = setTimeout(() => notesModal.style.removeProperty('transform'), 400);
        } else {
            notesModal.style.removeProperty('transform');
        }
    };

    notesModal.addEventListener('touchstart', handleMobileDragStart, { passive: true });
    notesModal.addEventListener('touchmove', handleMobileDragMove, { passive: false });
    notesModal.addEventListener('touchend', handleMobileDragEnd);
    notesModal.addEventListener('touchcancel', handleMobileDragEnd);

    let minDragging = false;
    let mainDragging = false;
    let hasDragged = false;
    let modalOffsetX: number, modalOffsetY: number;
    let startDragX: number, startDragY: number;

    const minimizedScale = .3;
    const minimizedOffsetX = 950 * (1 - minimizedScale) / 2;
    const minimizedOffsetY = 600 * (1 - minimizedScale) / 2;

    const handleDragStart = (e: MouseEvent | TouchEvent): void => {
        if (notesModal.classList.contains('fullscreen')) return;

        const target = e.target;
        if (!(target instanceof Element)) return;
        const isHeader = target.closest('.notes-header');
        const isMinimized = notesModal.classList.contains('minimized');

        if (!isHeader && !isMinimized) return;

        if (isMinimized) minDragging = true;
        else mainDragging = true;

        hasDragged = false;
        const event = 'touches' in e ? e.touches.item(0) : e;
        if (!event) return;
        const rect = notesModal.getBoundingClientRect();
        modalOffsetX = event.clientX - rect.left;
        modalOffsetY = event.clientY - rect.top;
        startDragX = event.clientX;
        startDragY = event.clientY;

        notesModal.style.transition = 'none';
        if (isHeader) e.preventDefault();
    };

    const handleDragMove = (e: MouseEvent | TouchEvent): void => {
        if (!minDragging && !mainDragging) return;
        const event = 'touches' in e ? e.touches.item(0) : e;
        if (!event) return;

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

    const handleDragEnd = (forceSnap: boolean | MouseEvent | TouchEvent = false): void => {
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
    let resizeStartX: number, resizeStartY: number;
    let resizeStartRect: DOMRect;
    const RESIZE_MIN_W = 700;
    const RESIZE_MIN_H = 400;
    let savedResizeWidth: string | null = null;
    let savedResizeHeight: string | null = null;
    let savedPositionLeft: string | null = null;
    let savedPositionTop: string | null = null;

    const handleResizeStart = (e: MouseEvent | TouchEvent): void => {
        if (notesModal.classList.contains('minimized') || notesModal.classList.contains('fullscreen')) return;
        const target = e.target;
        if (!(target instanceof Element)) return;
        const handle = target.closest<HTMLElement>('.resize-handle');
        if (!handle) return;

        const event = 'touches' in e ? e.touches.item(0) : e;
        if (!event) return;
        resizeDir = handle.dataset.dir ?? '';
        resizeStartX = event.clientX;
        resizeStartY = event.clientY;
        resizeStartRect = notesModal.getBoundingClientRect();

        isResizing = true;
        notesModal.style.transition = 'none';
        e.preventDefault();
        e.stopPropagation();
    };

    const handleResizeMove = (e: MouseEvent | TouchEvent): void => {
        if (!isResizing) return;
        const event = 'touches' in e ? e.touches.item(0) : e;
        if (!event) return;
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

    type MouseOrTouchHandler = (event: MouseEvent | TouchEvent) => void;
    const isTouchEvent = (event: Event): event is TouchEvent => 'touches' in event;
    const on = (
        element: EventTarget,
        eventName: string,
        handler: MouseOrTouchHandler,
        options?: boolean | AddEventListenerOptions
    ): void => {
        element.addEventListener(eventName, event => {
            if (event instanceof MouseEvent || isTouchEvent(event)) handler(event);
        }, options);
    };
    const onPair = (
        element: EventTarget,
        targetWindow: EventTarget,
        eventName: string,
        handler: MouseOrTouchHandler,
        options?: boolean | AddEventListenerOptions
    ): void => {
        on(element, eventName, handler, options);
        on(targetWindow, eventName.replace('mouse', 'touch'), handler, options);
    };

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

    document.querySelectorAll<HTMLElement>('.mac-min').forEach(btn => btn.addEventListener('click', minimizeNotes));
    document.querySelectorAll<HTMLElement>('.mac-max').forEach(btn => btn.addEventListener('click', maximizeNotes));
};
