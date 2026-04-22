import type { Message } from "../types/index.ts"

export function buildCurrentTurnMessageState(
  previousMessages: Message[],
  userMessage: Message,
  assistantPlaceholder: Message
) {
  const messagesForApi = [...previousMessages, userMessage]
  const messagesForUi = [...messagesForApi, assistantPlaceholder]

  return {
    messagesForApi,
    messagesForUi,
  }
}
