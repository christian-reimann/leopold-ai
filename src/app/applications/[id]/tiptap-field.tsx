'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';

const AUTOSAVE_DEBOUNCE_MS = 800;

export function TiptapField({ content, onSave }: { content: string; onSave: (html: string) => void }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor: instance }) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => onSave(instance.getHTML()), AUTOSAVE_DEBOUNCE_MS);
    },
  });

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (
    <EditorContent
      editor={editor}
      className="rounded-sm outline-none focus-within:ring-2 focus-within:ring-neutral-200 focus-within:ring-offset-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
    />
  );
}
