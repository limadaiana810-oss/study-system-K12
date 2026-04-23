export function nextQuickReplyInput(params: {
  currentInput: string
  presetMessage: string
  hasFilledPreset: boolean
}): string {
  return params.hasFilledPreset ? params.currentInput : params.presetMessage
}
