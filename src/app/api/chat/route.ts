import type { UIMessage } from 'ai';
import { z } from 'zod';
import { agentService } from '@/core/agent/agent-service';
import { conversationService } from '@/core/conversations/conversation-service';
import { getActiveProfileId } from '@/core/profile/active-profile';

// `messages` comes from the useChat client (the default transport sends the entire
// local message history) – server-authoritatively, though, only the last (new)
// user message is used, the rest of the history comes from the DB (agent-service.ts).
const ChatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  applicationId: z.uuid().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const { messages, applicationId } = ChatRequestSchema.parse(await request.json());
  const userMessage = messages[messages.length - 1]!;

  const profileId = await getActiveProfileId();
  const conversationId = await conversationService.getOrCreate(profileId);

  return agentService.streamChat({ conversationId, userMessage, applicationId, abortSignal: request.signal });
}
