import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { IframeExtension } from './extensions/IframeExtension';
import WikiToolbar from './WikiToolbar';

interface WikiEditorProps {
    content: any;
    editable: boolean;
    onSave?: (json: any) =>Promise<void> | void;
    onCancel?: () => void;
    onChange?: (json: any) => void;
}

const WikiEditor: React.FC<WikiEditorProps> = ({ content, editable, onSave, onCancel, onChange }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!editor || !onSave || isSaving) return;
        setIsSaving(true);
        try {
            await onSave(editor.getJSON());
        } finally {
            setIsSaving(false);
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: false,
                underline: false,
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
            Image.configure({ inline: false }),
            Link.configure({
                openOnClick: !editable,
                HTMLAttributes: { class: 'wiki-link' },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Youtube.configure({
                inline: false,
                nocookie: true,
            }),
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
            IframeExtension,
        ],
        content: content && Object.keys(content).length > 0 ? content : undefined,
        editable,
        onUpdate: onChange ? ({ editor: e }) => onChange(e.getJSON()) : undefined,
        editorProps: {
            attributes: {
                class: 'wiki-editor-content prose prose-invert prose-slate prose-base md:prose-lg max-w-none focus:outline-hidden min-h-[60vh] md:min-h-[400px] p-4',
            },
        },
    });

    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    useEffect(() => {
        if (editor && content && Object.keys(content).length > 0) {
            const currentContent = editor.getJSON();
            // Only update if content actually differs to prevent cursor reset
            if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="wiki-editor">
            {editable && <WikiToolbar editor={editor} />}
            <div className={`rounded-lg border ${editable ? 'border-sky-500/30 bg-slate-900/50' : 'border-transparent bg-transparent'}`}>
                <EditorContent editor={editor} />
            </div>
            {editable && onSave && (
                <div className="sticky bottom-0 z-10 mt-4 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-slate-950/95 backdrop-blur-xs border-t border-slate-700/60 md:border-t-0 md:bg-transparent md:backdrop-blur-none flex justify-end gap-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >Abbrechen</button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} mr-2`}></i>{isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WikiEditor;
