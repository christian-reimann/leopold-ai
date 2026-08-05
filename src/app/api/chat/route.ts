import type { UIMessage } from 'ai';
import { z } from 'zod';
import { agentService } from '@/core/agent/agent-service';
import type { AgentContext } from '@/core/agent/context';
import { conversationService } from '@/core/conversations/conversation-service';

// `messages` kommt vom useChat-Client (Default-Transport schickt den kompletten lokalen
// Nachrichtenverlauf mit) – server-autoritativ wird trotzdem nur die letzte (neue)
// Nutzer-Nachricht übernommen, der Rest der Historie kommt aus der DB (agent-service.ts).
const ChatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  applicationId: z.uuid().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const { messages, applicationId } = ChatRequestSchema.parse(await request.json());
  const userMessage = messages[messages.length - 1]!;

  const context: AgentContext = applicationId ? { scope: 'application', applicationId } : { scope: 'global' };
  const conversationId = await conversationService.getOrCreateGlobal();

  return agentService.streamChat({ conversationId, userMessage, context });
}
