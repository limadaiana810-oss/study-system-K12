export const USER_NAME = "吴彦祖"

export const QUICK_REPLIES = [
  {
    id: "intro",
    label: "上传文件",
    message: `你好！我是${USER_NAME}，一名演员，我想整理我的数学错题。`,
    triggerUpload: true,
    fillInput: true,  // 填充到输入框，让用户可以编辑
  },
  {
    id: "retrieve",
    label: "帮我整理错题",
    message: "帮我整理我的数学错题",
    triggerUpload: false,
    fillInput: false,
  },
] as const
