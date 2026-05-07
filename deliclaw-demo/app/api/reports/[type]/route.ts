import { NextResponse } from "next/server"
import {
  buildMockGrowthReport,
  buildMockWrongQuestionReport,
} from "@/lib/mockReports"
import type { ReportType } from "@/lib/reportTypes"

// Demo mode: reports are returned from `lib/mockReports.ts` instead of calling the LLM.
// To re-enable the live LLM pipeline, restore the version from
// `docs/superpowers/plans/2026-05-07-report-center.md` Task 7.
export async function POST(
  _req: Request,
  context: { params: Promise<{ type: string }> }
): Promise<Response> {
  const { type } = await context.params
  const reportType = type as ReportType

  try {
    if (reportType === "wrong-questions") {
      return NextResponse.json({ ok: true, report: buildMockWrongQuestionReport() })
    }
    if (reportType === "growth") {
      return NextResponse.json({ ok: true, report: buildMockGrowthReport() })
    }
    return NextResponse.json({ ok: false, error: "unknown_report_type" }, { status: 400 })
  } catch (err) {
    console.error(`[reports/${reportType}] mock build failed:`, err)
    const msg = err instanceof Error ? err.message : "report_build_failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
