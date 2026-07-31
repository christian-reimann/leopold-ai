'use client';

import { useCallback, useState, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument } from './document-actions';

export function UploadDropzone() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set('file', file);

    startTransition(async () => {
      try {
        await uploadDocument(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer border px-6 py-10 text-center text-sm ${
          isDragActive ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 border-dashed'
        }`}
      >
        <input {...getInputProps()} />
        {isPending ? (
          <p>Wird hochgeladen …</p>
        ) : isDragActive ? (
          <p>Datei hier ablegen …</p>
        ) : (
          <p>Datei hierher ziehen oder klicken (PDF, DOCX, TXT, JPG, PNG, WEBP)</p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
