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
    });

    const uiStream = toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: history,
      // Without this, a new assistant reply gets no id (empty string), because
      // `originalMessages` ends with a user message, not an assistant message
      // (see UIMessageStreamOptions.generateMessageId) – that then collides as a duplicate key
      // with the next assistant message, which also gets id=''.
      generateMessageId: generateId,
      onEnd: async ({ responseMessage }) => {
        await conversationService.appendMessages(conversationId, [responseMessage]);
      },
    });

    return createUIMessageStreamResponse({ stream: uiStream });
  }
}

export const agentService = new AgentService();
