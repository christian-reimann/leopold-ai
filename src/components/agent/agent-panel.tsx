'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AgentChat } from './agent-chat';

function resolveApplicationId(pathname: string): string | undefined {
  return pathname.match(/^\/applications\/([^/]+)/)?.[1];
}

const transport = new DefaultChatTransport({ api: '/api/chat' });

export function AgentPanel() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

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

  return (
    <aside className="flex h-full min-h-0 w-96 shrink-0 flex-col border-l border-neutral-200">
      {initialMessages === null ? (
        <>
          <div className="border-b border-neutral-200 px-3 py-3 text-sm font-semibold">Mortimer</div>
          <p className="p-3 text-sm text-neutral-400">Lädt …</p>
        </>
      ) : (
        <AgentPanelReady initialMessages={initialMessages} />
      )}
    </aside>
  );
}

function AgentPanelReady({ initialMessages }: { initialMessages: UIMessage[] }) {
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
