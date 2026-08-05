'use client';

import type { ChatStatus, UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MessagePart = UIMessagePart<UIDataTypes, UITools>;
type ToolPart = Extract<MessagePart, { toolCallId: string }>;

function isToolPart(part: MessagePart): part is ToolPart {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
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

  const isBusy = status === 'submitted' || status === 'streaming';

  function handleSubmit() {
    const text = draft.trim();
    if (!text || isBusy) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-3">
        <div className="space-y-3 py-3">
          {messages.length === 0 && (
            <p className="text-sm text-neutral-400">Frag Mortimer nach deinen Dokumenten, Suchaufträgen oder Jobs.</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                message.role === 'user' ? 'ml-6 bg-neutral-900 text-white' : 'mr-6 bg-neutral-100 text-neutral-900',
              )}
            >
              {message.parts.map((part, index) => (
                <MessagePartView key={index} part={part} onApprove={onApprove} />
              ))}
            </div>
          ))}
          {isBusy && (
            <div className="mr-6 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Mortimer denkt nach …</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-end gap-2 border-t border-neutral-200 p-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Nachricht an Mortimer …"
          className="min-h-10 resize-none"
        />
        <Button onClick={handleSubmit} disabled={isBusy || draft.trim().length === 0}>
          Senden
        </Button>
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
    return <p className="whitespace-pre-wrap">{part.text}</p>;
  }

  if (isToolPart(part)) {
    const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.slice('tool-'.length);

    if (part.state === 'approval-requested') {
      return (
        <div className="my-1 space-y-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-neutral-900">
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
      <p className="my-1 font-mono text-xs text-neutral-500">
        🔧 {toolName} · {part.state}
      </p>
    );
  }

  return null;
}
