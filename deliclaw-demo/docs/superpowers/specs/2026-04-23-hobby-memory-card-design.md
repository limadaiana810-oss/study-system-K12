# 爱好记忆卡 Design

## Goal

让记忆中心的长期记忆区明确展示一张“爱好”卡，并确保 AI 从对话中推断出的兴趣内容能够自动沉淀到长期记忆。

## Current State

- 模型提示词已经要求把“爱好、习惯、偏好”输出到 `inferredCandidates`，并使用 `field="preferences"`。
- `memoryParser.applyInferredCandidate()` 已支持把 `preferences` 写入 `memory.inferred.preferences`。
- `DatabaseHub` 当前把 `preferences` 展示为“已确认偏好”，没有“爱好”这一用户语义。
- 页面层当前没有消费 `autoConfirmAt` 的逻辑，`pendingInferred` 会堆积，推断记忆不会自动写入长期记忆。

## Decision

- 不新增 `hobbies` 字段，继续使用 `memory.inferred.preferences` 作为存储槽位。
- 用户可见语义统一为“爱好”，不再显示“已确认偏好”。
- 自动接受逻辑在页面层完成：当 `pendingInferred` 中的候选到达 `autoConfirmAt` 后，自动调用现有 `applyInferredCandidate()` 写入 `memory`，并从待处理队列中移除。
- 这次不恢复“待确认候选”界面；保留当前精简版记忆中心，只补全自动沉淀链路。

## File Changes

- `components/DatabaseHub.tsx`
  - 将 `preferences` 的长期记忆卡标题改为“爱好”。
  - 空状态文案补充“爱好”，让用户知道兴趣信息也会沉淀到这里。
- `lib/prompts.ts`
  - 强化提示词中关于爱好的示例，引导模型更稳定地把“喜欢篮球/爱看科幻”之类的表达归入 `preferences`。
- `lib/turnInsight.ts`
  - 将 `preferences` 的用户可见标签改为“爱好”，保持调试语义一致。
- `lib/pendingInferred.ts`
  - 新增纯函数，负责计算到期候选、应用到 `memory` 并返回新的 `pendingInferred`。
- `app/page.tsx`
  - 使用新的纯函数和计时器 effect，在候选到期时自动写入长期记忆并清理 `turnInsight` 中已接受项。

## Testing

- `components/DatabaseHub.test.mts`
  - 断言长期记忆区展示“爱好”，不再展示“已确认偏好”。
- `lib/prompts.test.mts`
  - 断言系统提示词明确提到“爱好”示例和 `field=preferences`。
- `lib/turnInsight.test.mts`
  - 断言 `preferences` 候选在 insight 中展示为“爱好”。
- `lib/pendingInferred.test.mts`
  - 断言到期候选会写入 `memory.inferred.preferences`，未到期候选不会被提前接受。
- `app/page.test.mts`
  - 断言页面层接入了自动确认 helper 和计时逻辑。

## Risks

- 当前工作区已有未提交改动，相关文件需要增量修改，不能回退现有内容。
- 自动接受会影响所有带 `autoConfirmAt` 的推断候选，不仅限于爱好；这与现有提示词中“5 秒后自动接受”的产品语义一致。
