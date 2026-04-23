export type StudentStateAvatar = {
  emotion: string
  title: string
  description: string
  src: string
  accent: string
}

const STUDENT_STATES: Record<string, StudentStateAvatar> = {
  平静: {
    emotion: "平静",
    title: "平静",
    description: "状态稳定，可以继续学习。",
    src: "/student-states/normal.png",
    accent: "#60A5FA",
  },
  好奇: {
    emotion: "好奇",
    title: "好奇",
    description: "正在主动探索新问题。",
    src: "/student-states/curious.png",
    accent: "#8B5CF6",
  },
  高兴: {
    emotion: "高兴",
    title: "高兴",
    description: "反馈积极，学习动力不错。",
    src: "/student-states/happy.png",
    accent: "#34D399",
  },
  愉悦: {
    emotion: "愉悦",
    title: "高兴",
    description: "反馈积极，学习动力不错。",
    src: "/student-states/happy.png",
    accent: "#34D399",
  },
  满足: {
    emotion: "满足",
    title: "满足",
    description: "当前节奏比较顺利。",
    src: "/student-states/happy.png",
    accent: "#14B8A6",
  },
  焦虑: {
    emotion: "焦虑",
    title: "焦虑",
    description: "需要更清晰的拆解和鼓励。",
    src: "/student-states/worried.png",
    accent: "#F59E0B",
  },
  担心: {
    emotion: "担心",
    title: "焦虑",
    description: "需要更清晰的拆解和鼓励。",
    src: "/student-states/worried.png",
    accent: "#F59E0B",
  },
  紧张: {
    emotion: "紧张",
    title: "焦虑",
    description: "需要更清晰的拆解和鼓励。",
    src: "/student-states/worried.png",
    accent: "#F59E0B",
  },
  生气: {
    emotion: "生气",
    title: "生气",
    description: "先接住情绪，再慢慢回到问题。",
    src: "/student-states/angry.png",
    accent: "#F97316",
  },
  疲惫: {
    emotion: "疲惫",
    title: "疲惫",
    description: "适合放慢节奏，减少负担。",
    src: "/student-states/sad.png",
    accent: "#94A3B8",
  },
  沮丧: {
    emotion: "沮丧",
    title: "伤心",
    description: "需要先被安抚，再小步推进。",
    src: "/student-states/sad.png",
    accent: "#EF4444",
  },
  伤心: {
    emotion: "伤心",
    title: "伤心",
    description: "需要先被安抚，再小步推进。",
    src: "/student-states/sad.png",
    accent: "#EF4444",
  },
}

export function getStudentStateAvatar(emotion?: string): StudentStateAvatar {
  if (emotion && STUDENT_STATES[emotion]) return STUDENT_STATES[emotion]
  return STUDENT_STATES["平静"]
}
