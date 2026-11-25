import type { JSONContent } from '@tiptap/core';

const NOTES_KEY = 'apple_notes_data';
const SEED_PINS_KEY = 'apple_notes_seed_pins';

export interface NoteData {
    title: string;
    content: string;
    contentJson?: JSONContent;
    folder: string;
    lastEdited: string | number | Date;
    pinned?: boolean;
    deletedAt?: number;
    originalFolder?: string;
}

export type NotesData = Record<string, NoteData>;

export const isTiptapDocument = (content: unknown): content is JSONContent =>
    typeof content === 'object' && content !== null && 'type' in content && content.type === 'doc';

export const hydrateNotes = (notesData: NotesData, seedNoteIds: Set<string>): void => {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    if (savedNotes) {
        const userNotes: NotesData = JSON.parse(savedNotes);
        for (const [id, note] of Object.entries(userNotes)) {
            if (!seedNoteIds.has(id)) notesData[id] = note;
        }
    }

    const savedSeedPins = localStorage.getItem(SEED_PINS_KEY);
    if (savedSeedPins) {
        const pins: Record<string, boolean> = JSON.parse(savedSeedPins);
        for (const [id, pinned] of Object.entries(pins)) {
            if (seedNoteIds.has(id) && notesData[id]) notesData[id].pinned = pinned;
        }
    }
};

export const saveNotes = (notesData: NotesData, seedNoteIds: Set<string>): void => {
    const userNotes: NotesData = {};
    for (const [id, note] of Object.entries(notesData)) {
        if (seedNoteIds.has(id)) continue;
        userNotes[id] = {
            title: note.title,
            folder: note.folder,
            lastEdited: note.lastEdited,
            content: note.content,
            contentJson: note.contentJson,
            pinned: note.pinned
        };
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(userNotes));
};

export const saveSeedPins = (notesData: NotesData, seedNoteIds: Set<string>): void => {
    const pins: Record<string, boolean | undefined> = {};
    for (const id of seedNoteIds) {
        if (notesData[id]) pins[id] = notesData[id].pinned;
    }
    localStorage.setItem(SEED_PINS_KEY, JSON.stringify(pins));
};
