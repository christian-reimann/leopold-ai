'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { Bot, ChevronRight, RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AgentChat } from './agent-chat';

function resolveApplicationId(pathname: string): string | undefined {
  return pathname.match(/^\/applications\/([^/]+)/)?.[1];
}

const transport = new DefaultChatTransport({ api: '/api/chat' });
const COLLAPSED_STORAGE_KEY = 'mortimer-panel-collapsed';

export function AgentPanel() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Zustand kommt erst nach dem Mount aus localStorage (SSR kennt keine Browser-Präferenz) –
  // ein kurzes Aufblitzen im ausgeklappten Zustand ist hier unkritisch.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true');
  }, []);

  // Wird nur einmal beim Mount geladen (nicht pro Seitenwechsel) – Mortimer hat einen
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

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }

  if (collapsed) {
    return (
      <>
        <aside className="hidden h-full w-12 shrink-0 flex-col items-center border-l border-neutral-200 py-3 sm:flex">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={toggleCollapsed}
            aria-label="Mortimer-Panel ausklappen"
          >
            <Bot className="size-4" />
          </Button>
        </aside>
        <Button
          type="button"
          size="icon-lg"
          onClick={toggleCollapsed}
          aria-label="Mortimer-Panel öffnen"
          className="fixed right-4 bottom-4 z-50 rounded-full shadow-lg sm:hidden"
        >
          <Bot className="size-5" />
        </Button>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:hidden"
        onClick={toggleCollapsed}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex h-[85vh] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-neutral-200 bg-white shadow-xl',
          'sm:static sm:inset-auto sm:z-auto sm:h-full sm:w-96 sm:shrink-0 sm:rounded-none sm:border-t-0 sm:border-l sm:shadow-none',
        )}
      >
        {initialMessages === null ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-3">
              <span className="text-sm font-semibold">Mortimer</span>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={toggleCollapsed}
                aria-label="Mortimer-Panel einklappen"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
            <p className="p-3 text-sm text-neutral-400">Lädt …</p>
          </>
        ) : (
          <AgentPanelReady initialMessages={initialMessages} onCollapse={toggleCollapsed} />
        )}
      </aside>
    </>
  );
}

function AgentPanelReady({
  initialMessages,
  onCollapse,
}: {
  initialMessages: UIMessage[];
  onCollapse: () => void;
}) {
  const pathname = usePathname();
  const applicationId = resolveApplicationId(pathname);

  const { messages, sendMessage, addToolApprovalResponse, setMessages, status } = useChat({
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  async function handleReset() {
    await fetch('/api/conversations', { method: 'DELETE' });
    setMessages([]);
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-3">
        <span className="text-sm font-semibold">Mortimer</span>
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
            aria-label="Mortimer-Panel einklappen"
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
