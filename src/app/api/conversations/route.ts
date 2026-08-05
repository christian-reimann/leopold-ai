import { conversationService } from '@/core/conversations/conversation-service';

export async function GET(): Promise<Response> {
  const conversationId = await conversationService.getOrCreateGlobal();
  const messages = await conversationService.listMessages(conversationId);

  return Response.json({ conversationId, messages });
}

export async function DELETE(): Promise<Response> {
  await conversationService.clearGlobal();
  return new Response(null, { status: 204 });
}
