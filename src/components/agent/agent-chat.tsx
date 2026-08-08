'use client';

import type { ChatStatus, UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai';
import { ArrowUp, Loader2, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MessagePart = UIMessagePart<UIDataTypes, UITools>;
type ToolPart = Extract<MessagePart, { toolCallId: string }>;

type Attachment = {
  key: string;
  filename: string;
  status: 'uploading' | 'ready' | 'error';
  attachmentId?: string;
  error?: string;
};

function isToolPart(part: MessagePart): part is ToolPart {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
}

function isVisiblePart(part: MessagePart): boolean {
  if (part.type === 'text') return part.text.trim().length > 0;
  return isToolPart(part);
}

function hasVisibleContent(message: UIMessage): boolean {
  return message.parts.some(isVisiblePart);
}

const markdownComponents = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ ...props }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0" {...props} />,
  ol: ({ ...props }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0" {...props} />,
  a: ({ ...props }) => <a className="underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />,
  code: ({ ...props }) => <code className="rounded bg-black/10 px-1 py-0.5 text-xs" {...props} />,
};

function buildMessageText(draft: string, attachments: Attachment[]): string {
  const tags = attachments
    .filter((attachment): attachment is Attachment & { attachmentId: string } => attachment.status === 'ready')
    .map((attachment) => `[Angehängte Datei: ${attachment.filename}, attachmentId: ${attachment.attachmentId}]`);

  return [...tags, draft.trim()].filter(Boolean).join('\n');
}

export function AgentChat({
  messages,
  status,
  onSend,
  onApprove,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  onSend: (text: string) => void;
  onApprove: (approvalId: string, approved: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages, isBusy]);
  const isUploading = attachments.some((attachment) => attachment.status === 'uploading');
  const hasReadyAttachment = attachments.some((attachment) => attachment.status === 'ready');
  const canSend = !isBusy && !isUploading && (draft.trim().length > 0 || hasReadyAttachment);

  function handleSubmit() {
    if (!canSend) return;
    onSend(buildMessageText(draft, attachments));
    setDraft('');
    setAttachments([]);
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const key = `${file.name}-${crypto.randomUUID()}`;
      setAttachments((prev) => [...prev, { key, filename: file.name, status: 'uploading' }]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/chat/attachments', { method: 'POST', body: formData });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'Upload fehlgeschlagen');
        }
        const data = (await response.json()) as { attachmentId: string; filename: string };
        setAttachments((prev) =>
          prev.map((attachment) =>
            attachment.key === key ? { ...attachment, status: 'ready', attachmentId: data.attachmentId } : attachment,
          ),
        );
      } catch (error) {
        setAttachments((prev) =>
          prev.map((attachment) =>
            attachment.key === key
              ? {
                  ...attachment,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
                }
              : attachment,
          ),
        );
      }
    }
  }

  function removeAttachment(key: string) {
    setAttachments((prev) => prev.filter((attachment) => attachment.key !== key));
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-3">
        <div className="space-y-3 py-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Frag Leopold nach deinen Dokumenten, Suchaufträgen oder Jobs.</p>
          )}
          {messages.filter(hasVisibleContent).map((message) => (
            <div
              key={message.id}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                message.role === 'user' ? 'ml-6 bg-primary text-primary-foreground' : 'mr-6 bg-muted text-foreground',
              )}
            >
              {message.parts.map((part, index) => (
                <MessagePartView key={index} part={part} onApprove={onApprove} />
              ))}
            </div>
          ))}
          {isBusy && (
            <div className="mr-6 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Leopold denkt nach …</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((attachment) => (
              <span
                key={attachment.key}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs',
                  attachment.status === 'error'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-border bg-muted text-foreground',
                )}
              >
                {attachment.status === 'uploading' && <Loader2 className="size-3 animate-spin" />}
                <span className="max-w-40 truncate" title={attachment.error ?? attachment.filename}>
                  {attachment.filename}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.key)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Anhang ${attachment.filename} entfernen`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFilesSelected(event.target.files);
            event.target.value = '';
          }}
        />
        <div className="w-full rounded-2xl border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Nachricht an Leopold …"
            className="min-h-10 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              aria-label="Datei anhängen"
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSend}
              size="icon-sm"
              className="shrink-0 rounded-full"
              aria-label="Senden"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagePartView({
  part,
  onApprove,
}: {
  part: MessagePart;
  onApprove: (approvalId: string, approved: boolean) => void;
}) {
  if (part.type === 'text') {
    return <ReactMarkdown components={markdownComponents}>{part.text}</ReactMarkdown>;
  }

  if (isToolPart(part)) {
    const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.slice('tool-'.length);

    if (part.state === 'approval-requested') {
      return (
        <div className="my-1 space-y-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-foreground">
          <p className="text-xs font-medium">Bestätigung nötig: {toolName}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onApprove(part.approval.id, true)}>
              Bestätigen
            </Button>
            <Button size="sm" variant="outline" onClick={() => onApprove(part.approval.id, false)}>
              Ablehnen
            </Button>
          </div>
        </div>
      );
    }

    return (
      <p className="my-1 font-mono text-xs text-muted-foreground">
        🔧 {toolName} · {part.state}
      </p>
    );
  }

  return null;
}
