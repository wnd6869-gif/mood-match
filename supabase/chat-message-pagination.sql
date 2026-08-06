-- Cursor pagination for conversation history. The id tie-breaker prevents
-- duplicate/omitted rows when messages share a created_at timestamp.
create index if not exists messages_conversation_created_id_idx
  on public.messages (conversation_id, created_at desc, id desc);
