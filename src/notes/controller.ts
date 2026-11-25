import type { JSONContent } from '@tiptap/core';
import { createNotesEditor } from './editor';
import {
    isTiptapDocument,
    type NoteData,
    type NotesData
} from './storage';

interface NotesEditorOptions {
    titleElement: HTMLElement | null;
    contentElement: HTMLElement | null;
    notesData: NotesData;
    isBuiltInNoteId: (id: string) => boolean;
    saveNotes: () => void;
    refreshNotesList: () => void;
    formatFullNoteDate: (timestamp: NoteData['lastEdited']) => string;
}

interface NotesEditorController {
    displayNote: (noteId: string | number, data: NoteData) => void;
    extractPreviewText: (content: string | JSONContent) => string;
}

const textFromContentJson = (node: JSONContent): string =>
    node.type === 'text' ? node.text || '' : (node.content || []).map(textFromContentJson).join(' ');

const extractPreviewText = (content: string | JSONContent): string => {
    if (typeof content !== 'string') {
        const firstBlock = content.content?.[0] || content;
        return textFromContentJson(firstBlock).replace(/\s+/g, ' ').trim().substring(0, 120);
    }

    const container = document.createElement('div');
    container.innerHTML = content;
    const firstChild = container.querySelector('li, p, div, blockquote, h1, h2, h3, h4, h5, h6');
    const text = (firstChild || container).textContent || '';
    return text.replace(/\s+/g, ' ').trim().substring(0, 120);
};

export const setupNotesEditor = ({
    titleElement,
    contentElement,
    notesData,
    isBuiltInNoteId,
    saveNotes,
    refreshNotesList,
    formatFullNoteDate
}: NotesEditorOptions): NotesEditorController => {
    let editor: ReturnType<typeof createNotesEditor> | null = null;

    const updateToolbar = () => {
        const titleFocused = document.activeElement === titleElement;
        document.querySelectorAll<HTMLElement>('.notes-toolbar-btn, .toolbar-divider').forEach(element => {
            element.style.opacity = titleFocused ? '.35' : '1';
            element.style.pointerEvents = titleFocused ? 'none' : 'auto';
        });
        if (!editor || titleFocused) return;

        const activeStates: Record<string, boolean> = {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strikeThrough: editor.isActive('strike'),
            insertUnorderedList: editor.isActive('bulletList') && !editor.isActive('bulletList', { dashed: true }),
            insertOrderedList: editor.isActive('orderedList'),
            insertChecklist: editor.isActive('taskList'),
            insertDashList: editor.isActive('bulletList', { dashed: true })
        };

        document.querySelectorAll<HTMLElement>('.notes-header-right .notes-toolbar-btn').forEach(button => {
            const command = button.getAttribute('data-command');
            button.classList.toggle('active', !!command && !!activeStates[command]);
        });
        document.getElementById('notes-mono-btn')?.classList.toggle(
            'active',
            editor.isActive('textStyle', { fontFamily: 'monospace' })
        );
    };

    const saveTitle = () => {
        const noteId = contentElement?.getAttribute('data-current-note');
        if (!titleElement || !noteId || isBuiltInNoteId(noteId) || !notesData[noteId]) return;

        const note = notesData[noteId];
        note.title = titleElement.innerText;
        note.lastEdited = Date.now();
        saveNotes();
        const dateElement = document.getElementById('active-note-date');
        if (dateElement) dateElement.innerText = formatFullNoteDate(note.lastEdited);
        refreshNotesList();
    };

    const saveActiveNote = () => {
        const noteId = contentElement?.getAttribute('data-current-note');
        if (!editor || !titleElement || !noteId || isBuiltInNoteId(noteId) || !notesData[noteId]) return;

        const note = notesData[noteId];
        note.title = titleElement.innerText;
        note.contentJson = editor.getJSON();
        note.content = editor.getHTML();
        note.lastEdited = Date.now();
        saveNotes();

        const dateElement = document.getElementById('active-note-date');
        if (dateElement) dateElement.innerText = formatFullNoteDate(note.lastEdited);
        refreshNotesList();
    };

    const displayNote = (noteId: string | number, data: NoteData): void => {
        if (!contentElement || !titleElement || !editor) return;

        const noteIdString = String(noteId);
        const changed = contentElement.getAttribute('data-current-note') !== noteIdString;
        contentElement.setAttribute('data-current-note', noteIdString);

        if (isTiptapDocument(data.contentJson)) {
            editor.commands.setContent(data.contentJson, { emitUpdate: false });
        } else {
            if (data.contentJson) {
                console.warn(`Ignoring invalid Tiptap document for note "${noteIdString}"; using its HTML backup.`);
            }
            data.contentJson = editor.getJSON();
            data.content = editor.getHTML();
            if (!isBuiltInNoteId(noteIdString)) saveNotes();
        }

        titleElement.innerText = data.title;
        const dateElement = document.getElementById('active-note-date');
        if (dateElement) dateElement.innerText = formatFullNoteDate(data.lastEdited);

        if (changed) {
            const container = contentElement.closest('.notes-content');
            if (container) container.scrollTop = 0;
        }
    };

    if (titleElement && contentElement) {
        editor = createNotesEditor(contentElement, saveActiveNote, updateToolbar);

        const changeIndent = (amount: number) => {
            if (!editor) return;
            const nodeType = ['taskItem', 'listItem', 'heading', 'blockquote', 'paragraph']
                .find(type => editor?.isActive(type));
            if (!nodeType) return;
            const currentIndent = Number(editor.getAttributes(nodeType).indent) || 0;
            editor.chain().focus().updateAttributes(nodeType, { indent: Math.max(0, currentIndent + amount) }).run();
        };

        const actions: Record<string, () => void> = {
            bold: () => editor?.chain().focus().toggleBold().run(),
            italic: () => editor?.chain().focus().toggleItalic().run(),
            underline: () => editor?.chain().focus().toggleUnderline().run(),
            strikeThrough: () => editor?.chain().focus().toggleStrike().run(),
            insertUnorderedList: () => {
                if (!editor) return;
                if (editor.isActive('bulletList', { dashed: true })) {
                    editor.chain().focus().updateAttributes('bulletList', { dashed: false }).run();
                } else {
                    editor.chain().focus().toggleBulletList().run();
                }
            },
            insertOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
            insertChecklist: () => editor?.chain().focus().toggleTaskList().run(),
            insertDashList: () => {
                if (!editor) return;
                if (editor.isActive('bulletList', { dashed: true })) {
                    editor.chain().focus().toggleBulletList().run();
                } else if (editor.isActive('bulletList')) {
                    editor.chain().focus().updateAttributes('bulletList', { dashed: true }).run();
                } else {
                    editor.chain().focus().toggleBulletList().updateAttributes('bulletList', { dashed: true }).run();
                }
            },
            indent: () => changeIndent(24),
            outdent: () => changeIndent(-24)
        };

        document.querySelectorAll<HTMLElement>('.notes-toolbar-btn').forEach(button => {
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', event => {
                event.preventDefault();
                const command = button.getAttribute('data-command');
                if (command) actions[command]?.();
                updateToolbar();
            });
        });

        const monospaceButton = document.getElementById('notes-mono-btn');
        monospaceButton?.addEventListener('mousedown', event => event.preventDefault());
        monospaceButton?.addEventListener('click', () => {
            if (!editor) return;
            if (editor.isActive('textStyle', { fontFamily: 'monospace' })) {
                editor.chain().focus().unsetFontFamily().run();
            } else {
                editor.chain().focus().setFontFamily('monospace').run();
            }
        });

        titleElement.addEventListener('input', saveTitle);
        titleElement.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                editor?.commands.focus('start');
            } else if ((event.metaKey || event.ctrlKey) && ['b', 'i', 'u', 's', '[', ']'].includes(event.key.toLowerCase())) {
                event.preventDefault();
                editor?.commands.focus();
            }
        });
        titleElement.addEventListener('paste', event => {
            event.preventDefault();
            document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '');
        });
        titleElement.addEventListener('blur', () => {
            titleElement.innerHTML = titleElement.innerText;
            saveTitle();
            updateToolbar();
        });

        titleElement.addEventListener('focus', updateToolbar);
        contentElement.addEventListener('focus', updateToolbar);
        document.addEventListener('selectionchange', updateToolbar);
    }

    return { displayNote, extractPreviewText };
};
