import { convertToModelMessages, generateId, stepCountIs, streamText, type ToolApprovalStatus, type UIMessage } from 'ai';
import { conversationService } from '@/core/conversations/conversation-service';
import { chatModel } from '@/llm/provider';
import type { AgentContext } from './context';
import { buildSystemPrompt } from './system-prompt';
import { buildAgentTools, DESTRUCTIVE_TOOL_NAMES } from './tool-registry';

const MAX_STEPS = 8;

export class AgentService {
  async streamChat({
    conversationId,
    userMessage,
    context,
  }: {
    conversationId: string;
    userMessage: UIMessage;
    context: AgentContext;
  }): Promise<Response> {
    await conversationService.appendMessages(conversationId, [userMessage]);
    const history = await conversationService.listMessages(conversationId);

    const tools = buildAgentTools(context);
    const toolApproval: Record<string, ToolApprovalStatus> = Object.fromEntries(
      DESTRUCTIVE_TOOL_NAMES.filter((name) => name in tools).map((name) => [name, 'user-approval']),
    );

    const result = streamText({
      model: chatModel,
      system: buildSystemPrompt(context),
      messages: await convertToModelMessages(history),
      tools,
      toolApproval,
      stopWhen: stepCountIs(MAX_STEPS),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: history,
      // Ohne das bekommt eine neue Assistant-Antwort keine id (leerer String), weil
      // `originalMessages` mit einer User-Nachricht endet, nicht mit einer Assistant-Nachricht
      // (siehe UIMessageStreamOptions.generateMessageId) – das kollidiert dann als Duplicate-Key
      // mit der nächsten Assistant-Nachricht, die ebenfalls id='' bekommt.
      generateMessageId: generateId,
      onFinish: async ({ messages }) => {
        // Nach einer Tool-Approval endet `history` bereits auf einer Assistant-Nachricht
        // (die gerade erst mit dem approval-response upgeserted wurde) – die Fortsetzung
        // dieses Turns hängt ihr Tool-Ergebnis an dieselbe Nachricht an, statt eine neue
        // anzuhängen. Ab `history.length` zu slicen würde dieses Update verpassen, daher
        // wird die letzte History-Nachricht in diesem Fall mit re-persistiert (Upsert).
        const continuesLastMessage = history.at(-1)?.role === 'assistant';
        const persistFrom = continuesLastMessage ? history.length - 1 : history.length;
        await conversationService.appendMessages(conversationId, messages.slice(persistFrom));
      },
    });
  }
}

export const agentService = new AgentService();
