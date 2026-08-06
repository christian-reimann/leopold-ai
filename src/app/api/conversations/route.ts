import { conversationService } from '@/core/conversations/conversation-service';
import { getActiveProfileId } from '@/core/profile/active-profile';

export async function GET(): Promise<Response> {
  const profileId = await getActiveProfileId();
  const conversationId = await conversationService.getOrCreate(profileId);
  const messages = await conversationService.listMessages(conversationId);

  return Response.json({ conversationId, messages });
}

export async function DELETE(): Promise<Response> {
  const profileId = await getActiveProfileId();
  await conversationService.clear(profileId);
  return new Response(null, { status: 204 });
}
