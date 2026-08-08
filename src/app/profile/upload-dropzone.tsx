'use client';

import { useCallback, useState, useTransition } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { uploadDocument } from './document-actions';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;

export function UploadDropzone() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      setError('Datei zu groß (max. 10 MB) oder Format nicht unterstützt.');
    }
    if (acceptedFiles.length === 0) return;

    const totalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      setError('Gesamtgröße aller Dateien überschreitet 25 MB.');
      return;
    }

    setError(null);
    const formData = new FormData();
    for (const file of acceptedFiles) {
      formData.append('file', file);
    }

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
    multiple: true,
    maxSize: MAX_FILE_SIZE_BYTES,
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
          isDragActive ? 'border-primary bg-muted' : 'border-input border-dashed'
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
