"use client"

import { useEffect } from "react"
import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "@/lib/reportTypes"
import WrongQuestionReportView from "./WrongQuestionReportView"
import GrowthReportView from "./GrowthReportView"

interface Props {
  reportType: ReportType
  report: WrongQuestionReport | GrowthReport
  onClose: () => void
}

export default function PrintPreviewModal({ reportType, report, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  function handlePrint() {
    window.print()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="打印预览"
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(20, 20, 26, 0.78)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Modal toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          color: "#F5EFD9",
          fontFamily: "var(--font-body)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 14,
            letterSpacing: "0.04em",
          }}
        >
          A4 打印预览
        </span>
        <span style={{ fontSize: 11, color: "rgba(245,239,217,0.55)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {reportType === "wrong-questions" ? "Wrong Question Report" : "Growth Report"}
        </span>
        <span style={{ fontSize: 11, color: "rgba(245,239,217,0.4)", marginLeft: 8 }}>
          按 Esc 关闭
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "7px 18px",
              borderRadius: "var(--r-sm)",
              border: "1px solid rgba(245,239,217,0.28)",
              background: "#F5EFD9",
              color: "#14141A",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            立即打印
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-sm)",
              border: "1px solid rgba(245,239,217,0.28)",
              background: "transparent",
              color: "#F5EFD9",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            关闭
          </button>
        </div>
      </div>

      {/* Scrollable preview area: scaled-down A4 pages */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "32px 24px 56px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            transform: "scale(0.62)",
            transformOrigin: "top center",
            // Compensate for the 0.62 scale so the scrollable container still
            // sees the visually-shrunk size, not the intrinsic 210mm width.
            width: "210mm",
            margin: "0 auto -38vh",
          }}
        >
          <div className="print-region">
            <PrintPage>
              {reportType === "wrong-questions" ? (
                <WrongQuestionReportView
                  report={report as WrongQuestionReport}
                  printMode
                />
              ) : (
                <GrowthReportView report={report as GrowthReport} printMode />
              )}
            </PrintPage>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrintPage({ children }: { children: React.ReactNode }) {
  // A single rendered region. The visible "page break" is enforced by
  // <div className="print-page-break" /> inside the report views, plus
  // .print-card page-break-inside: avoid in @media print.
  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#FBF7E8",
        boxShadow: "0 14px 40px rgba(0,0,0,0.32)",
        padding: "8mm",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  )
}
