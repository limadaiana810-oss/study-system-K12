"use client"

import type { WrongQuestionReport } from "@/lib/reportTypes"
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const SUBJECT_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]

interface Props {
  report: WrongQuestionReport
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 w-1 rounded-full bg-indigo-500" />
      <h3 className="text-sm font-bold text-slate-800">{children}</h3>
    </div>
  )
}

function OverviewCard({ overview }: { overview: WrongQuestionReport["overview"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>错题总览</SectionTitle>
      <div className="mb-3 text-xs text-slate-500">共 {overview.total} 道</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-44">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">学科分布</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={overview.bySubject}
                dataKey="count"
                nameKey="subject"
                outerRadius={50}
                label={({ subject }) => subject}
              >
                {overview.bySubject.map((_, i) => (
                  <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-44">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">题型分布</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.byQuestionType}>
              <XAxis dataKey="type" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function WeakPointsCard({ weakPoints }: { weakPoints: WrongQuestionReport["weakPoints"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>薄弱知识点</SectionTitle>
      {weakPoints.length === 0 ? (
        <p className="text-xs text-slate-400">暂无足够数据</p>
      ) : (
        <div className="space-y-2">
          {weakPoints.map((wp, i) => (
            <div key={i} className="rounded-xl border border-indigo-50 bg-indigo-50/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-800">{wp.knowledgePoint}</span>
                <span className="text-[10px] text-slate-500">
                  {wp.subject} · 出现 {wp.occurrences} 次
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{wp.diagnosis}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ErrorPatternsCard({ errorPatterns }: { errorPatterns: WrongQuestionReport["errorPatterns"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>错误模式</SectionTitle>
      {errorPatterns.length === 0 ? (
        <p className="text-xs text-slate-400">暂未识别出共性错误模式</p>
      ) : (
        <div className="space-y-2">
          {errorPatterns.map((p, i) => (
            <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-sm font-bold text-amber-800">{p.pattern}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.evidence}</p>
              {p.fileRefs.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">涉及：{p.fileRefs.join("、")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function priorityColor(priority: "高" | "中" | "低") {
  if (priority === "高") return "bg-red-50 text-red-600 border-red-100"
  if (priority === "中") return "bg-amber-50 text-amber-600 border-amber-100"
  return "bg-emerald-50 text-emerald-600 border-emerald-100"
}

function ActionPlanCard({ actionPlan }: { actionPlan: WrongQuestionReport["actionPlan"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>提分行动</SectionTitle>
      {actionPlan.length === 0 ? (
        <p className="text-xs text-slate-400">暂无行动建议</p>
      ) : (
        <div className="space-y-2">
          {actionPlan.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityColor(a.priority)}`}>
                {a.priority}
              </span>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-slate-800">{a.action}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  预估提升 {a.estimatedGain}
                  {a.targetWeakPoint ? ` · 目标：${a.targetWeakPoint}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function WrongQuestionReportView({ report }: Props) {
  return (
    <div className="space-y-3">
      <OverviewCard overview={report.overview} />
      <WeakPointsCard weakPoints={report.weakPoints} />
      <ErrorPatternsCard errorPatterns={report.errorPatterns} />
      <ActionPlanCard actionPlan={report.actionPlan} />
    </div>
  )
}
