import { Editor, Extension } from '@tiptap/core';
import { BulletList } from '@tiptap/extension-bullet-list';
import { FontFamily } from '@tiptap/extension-font-family';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextStyle } from '@tiptap/extension-text-style';
import { StarterKit } from '@tiptap/starter-kit';

const DashedBulletList = BulletList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            dashed: {
                default: false,
                parseHTML: (element: HTMLElement) =>
                    element.dataset.listStyle === 'dash' || element.style.listStyleType.includes('- '),
                renderHTML: (attributes: { dashed?: boolean }) =>
                    attributes.dashed
                        ? { 'data-list-style': 'dash', style: 'list-style-type: "- "' }
                        : {}
            }
        };
    }
});

const BlockIndent = Extension.create({
    name: 'blockIndent',

    addGlobalAttributes() {
        return [{
            types: ['paragraph', 'heading', 'blockquote', 'listItem', 'taskItem'],
            attributes: {
                indent: {
                    default: 0,
                    parseHTML: (element: HTMLElement) => {
                        const savedIndent = element.getAttribute('data-indent');
                        return savedIndent === null
                            ? Number.parseFloat(element.style.marginLeft) || 0
                            : Number.parseFloat(savedIndent) || 0;
                    },
                    renderHTML: (attributes: { indent?: number }) =>
                        attributes.indent
                            ? {
                                'data-indent': String(attributes.indent),
                                style: `margin-left: ${attributes.indent}px`
                            }
                            : {}
                }
            }
        }];
    }
});

export const createNotesEditor = (
    element: HTMLElement,
    onUpdate: () => void,
    onSelectionUpdate: () => void
): Editor => new Editor({
    element,
    extensions: [
        StarterKit.configure({ bulletList: false }),
        DashedBulletList,
        TextStyle,
        FontFamily.configure({ types: ['textStyle'] }),
        TaskList.configure({ HTMLAttributes: { class: 'checklist-list' } }),
        TaskItem.configure({ nested: true, HTMLAttributes: { class: 'checklist-item' } }),
        BlockIndent
    ],
    content: '<p></p>',
    editorProps: {
        attributes: { spellcheck: 'false' }
    },
    onUpdate,
    onSelectionUpdate
});
