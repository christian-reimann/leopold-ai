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
    abortSignal,
  }: {
    conversationId: string;
    userMessage: UIMessage;
    applicationId?: string;
    abortSignal?: AbortSignal;
  }): Promise<Response> {
    await conversationService.appendMessages(conversationId, [userMessage]);
    const [history, profileId] = await Promise.all([
      conversationService.listMessages(conversationId),
      conversationService.getProfileId(conversationId),
    ]);

    const tools = buildAgentTools(profileId);
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
      abortSignal,
    });

    const uiStream = toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: history,
      // Without this, a new assistant reply gets no id (empty string), because
      // `originalMessages` ends with a user message, not an assistant message
      generateMessageId: generateId,
      // `isAborted` (reported by the AI SDK via a dedicated "abort" stream chunk) races against
      // the response stream's own `cancel()` on client disconnect and isn't reliable here
      onEnd: async ({ responseMessage, isAborted }) => {
        if (isAborted || abortSignal?.aborted) return;
        await conversationService.appendMessages(conversationId, [responseMessage]);
      },
    });

    return createUIMessageStreamResponse({ stream: uiStream });
  }
}

export const agentService = new AgentService();
