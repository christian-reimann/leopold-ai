import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type ToolApprovalStatus,
  type UIMessage,
} from 'ai';
import { conversationService } from '@/core/conversations/conversation-service';
import { chatModel } from '@/llm/provider';
import { buildSystemPrompt } from './system-prompt';
import { buildAgentTools, DESTRUCTIVE_TOOL_NAMES } from './tool-registry';

const MAX_STEPS = 8;

export class AgentService {
  async streamChat({
    conversationId,
    userMessage,
    applicationId,
  }: {
    conversationId: string;
    userMessage: UIMessage;
    applicationId?: string;
  }): Promise<Response> {
    await conversationService.appendMessages(conversationId, [userMessage]);
    const history = await conversationService.listMessages(conversationId);

    const tools = buildAgentTools();
    const toolApproval: Record<string, ToolApprovalStatus> = Object.fromEntries(
      DESTRUCTIVE_TOOL_NAMES.filter((name) => name in tools).map((name) => [name, 'user-approval']),
    );

    const result = streamText({
      model: chatModel,
      system: buildSystemPrompt(applicationId),
      messages: await convertToModelMessages(history),
      tools,
      toolApproval,
      stopWhen: stepCountIs(MAX_STEPS),
    });

    const uiStream = toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: history,
      // Ohne das bekommt eine neue Assistant-Antwort keine id (leerer String), weil
      // `originalMessages` mit einer User-Nachricht endet, nicht mit einer Assistant-Nachricht
      // (siehe UIMessageStreamOptions.generateMessageId) – das kollidiert dann als Duplicate-Key
      // mit der nächsten Assistant-Nachricht, die ebenfalls id='' bekommt.
      generateMessageId: generateId,
      onEnd: async ({ responseMessage }) => {
        await conversationService.appendMessages(conversationId, [responseMessage]);
      },
    });

    return createUIMessageStreamResponse({ stream: uiStream });
  }
}

export const agentService = new AgentService();
