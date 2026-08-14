'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { Bot, ChevronRight, RotateCcw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AgentChat } from './agent-chat';

function resolveApplicationId(pathname: string): string | undefined {
  return pathname.match(/^\/applications\/([^/]+)/)?.[1];
}

const transport = new DefaultChatTransport({ api: '/api/chat' });

export function AgentPanel({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  // Wird nur einmal beim Mount geladen (nicht pro Seitenwechsel) – Leopold hat einen
  // einzigen, app-weiten Gesprächsverlauf, auch auf /applications/*-Seiten.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/conversations')
      .then((response) => response.json())
      .then((data: { messages: UIMessage[] }) => {
        if (!cancelled) setInitialMessages(data.messages);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (collapsed) {
    return (
      <>
        <aside className="hidden h-full w-full shrink-0 flex-col items-center border-l border-border py-3 sm:flex">
          <Button
            type="button"
            size="icon-sm"
            className="rounded-full"
            onClick={onToggleCollapsed}
            aria-label="Leopold-Panel ausklappen"
          >
            <Bot className="size-5" />
          </Button>
        </aside>
        <Button
          type="button"
          size="icon-lg"
          onClick={onToggleCollapsed}
          aria-label="Leopold-Panel öffnen"
          className="fixed right-4 bottom-4 z-50 rounded-full shadow-lg sm:hidden"
        >
          <Bot className="size-5" />
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={onToggleCollapsed} aria-hidden="true" />
      <aside
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex h-[85vh] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-xl',
          'sm:static sm:inset-auto sm:z-auto sm:h-full sm:w-full sm:shrink-0 sm:touch-auto sm:rounded-none sm:border-t-0 sm:border-l sm:shadow-none',
        )}
      >
        {initialMessages === null ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3">
              <span className="font-heading text-base font-semibold">Leopold</span>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onToggleCollapsed}
                aria-label="Leopold-Panel einklappen"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
            <p className="p-3 text-sm text-muted-foreground">Lädt …</p>
          </>
        ) : (
          <AgentPanelReady initialMessages={initialMessages} onCollapse={onToggleCollapsed} />
        )}
      </aside>
    </>
  );
}

function AgentPanelReady({ initialMessages, onCollapse }: { initialMessages: UIMessage[]; onCollapse: () => void }) {
  const pathname = usePathname();
  const applicationId = resolveApplicationId(pathname);
  const router = useRouter();

  const { messages, sendMessage, addToolApprovalResponse, setMessages, status } = useChat({
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => {
      if (!applicationId) return;

      const updatedCurrentApplication = message.parts.some((part) => {
        if (part.type !== 'tool-updateApplicationContent' || part.state !== 'output-available') return false;
        const input = part.input as { applicationId?: string } | undefined;
        return input?.applicationId === applicationId;
      });

      if (updatedCurrentApplication) router.refresh();
    },
  });

  async function handleReset() {
    await fetch('/api/conversations', { method: 'DELETE' });
    setMessages([]);
  }

  return (
    <>
      <div className="relative z-10 flex shrink-0 items-center justify-between px-3 py-3 shadow-sm">
        <span className="font-heading text-base font-semibold">Leopold AI</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleReset}
            disabled={messages.length === 0}
            aria-label="Gesprächsverlauf zurücksetzen"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onCollapse}
            aria-label="Leopold-Panel einklappen"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
      <AgentChat
        messages={messages}
        status={status}
        onSend={(text) => sendMessage({ text }, { body: { applicationId } })}
        onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
      />
    </>
  );
}
