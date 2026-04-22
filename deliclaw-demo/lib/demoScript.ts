export const USER_NAME = "凯伦"
export const USER_INTRO = `我叫凯伦，初一，喜欢数学和物理，不喜欢语文，语文成绩不好。想提升综合成绩，你能帮我吗？`

export const QUICK_REPLIES = [
  {
    id: "intro",
    label: "上传文件",
    message: USER_INTRO,
    triggerUpload: true,
  },
  {
    id: "retrieve",
    label: "帮我整理错题",
    message: "帮我整理我的数学错题",
    triggerUpload: false,
  },
] as const
