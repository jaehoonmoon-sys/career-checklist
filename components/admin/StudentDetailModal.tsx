'use client'

import { useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import {
  QUESTIONS, CATEGORIES, ANSWER_OPTIONS,
  JOB_LABELS, JOB_LABELS_FLAT, type JobType,
} from '@/lib/survey-questions'
import type { StudentRow } from '@/app/actions/admin'

const JOB_ORDER: JobType[] = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}

const OPTION_COLORS: Record<number, string> = {
  0: '#94a3b8', 1: '#3b82f6', 2: '#10b981', 3: '#8b5cf6', 4: '#f97316',
}

const toDisplayValue = (raw: number) =>
  raw === 0 ? 0 : Math.round(Math.pow(raw / 100, 0.55) * 100)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTick = ({ x, y, payload }: any) => {
  const lines = (payload.value as string).split('\n')
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line: string, i: number) => (
        <text key={i} x={0} y={0} dy={i * 12 - (lines.length - 1) * 6}
          textAnchor="middle" fill="#94a3b8" fontSize={10}>
          {line}
        </text>
      ))}
    </g>
  )
}

type Props = {
  student: StudentRow
  onClose: () => void
}

export default function StudentDetailModal({ student, onClose }: Props) {
  const { answers, top_job, job_pcts, student_name, answered_count, cohort } = student
  const chartColor = top_job ? JOB_COLORS[top_job] : '#94a3b8'

  const radarData = JOB_ORDER.map(job => ({
    subject: JOB_LABELS[job],
    value: toDisplayValue(job_pcts[job]),
    fullMark: 100,
  }))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const rightPanel = (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-600 mb-1">📊 직무 적합도 레이더</p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData} margin={{ top: 14, right: 32, bottom: 14, left: 32 }}>
            <PolarGrid gridType="polygon" stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={(props) => <CustomTick {...props} />} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={chartColor} fill={chartColor}
              fillOpacity={0.35} dot={{ r: 3, fill: chartColor }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs text-slate-400 mb-2">
          <span className="text-slate-700 font-semibold text-sm">{answered_count}</span>
          {' '}/ {QUESTIONS.length}개 항목 선택됨
        </p>
        {top_job && (
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${chartColor}14` }}>
            <p className="text-[11px] text-slate-400 mb-1">🔥 가장 잘 맞는 직무</p>
            <p className="text-lg font-bold leading-tight" style={{ color: chartColor }}>
              {JOB_LABELS_FLAT[top_job]}
            </p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: chartColor }}>
              적합도 {job_pcts[top_job]}%
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">직무별 적합도</p>
        {JOB_ORDER.map(job => {
          const pct = job_pcts[job]
          return (
            <div key={job} className="mb-2.5 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: JOB_COLORS[job] }}>
                  {JOB_LABELS_FLAT[job]}
                </span>
                <span className="text-xs text-slate-400">{pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: JOB_COLORS[job] }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-4xl bg-slate-50 flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">{student_name}</h2>
                <span className="text-xs text-slate-400">{cohort}</span>
              </div>
            </div>
            {top_job && (
              <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: JOB_COLORS[top_job] }}>
                {JOB_LABELS_FLAT[top_job]}
              </span>
            )}
            <span className="shrink-0 text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full hidden sm:inline">
              관리자 보기
            </span>
          </div>
          <button onClick={onClose}
            className="shrink-0 ml-3 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            ✕
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 모바일: 차트 상단 */}
          <div className="lg:hidden px-4 pt-4">{rightPanel}</div>

          <div className="px-4 py-5 lg:flex lg:gap-5 lg:items-start">
            {/* 질문 목록 */}
            <div className="flex-1 min-w-0 space-y-4">
              {CATEGORIES.map(cat => {
                const catQs = QUESTIONS.filter(q => q.category === cat.key)
                if (!catQs.length) return null
                const catDone = catQs.filter(q => answers[q.id] !== undefined).length

                return (
                  <div key={cat.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
                      <span className="ml-auto text-xs text-slate-400 font-medium">{catDone}/{catQs.length}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {catQs.map(q => {
                        const sel = answers[q.id]
                        const isAnswered = sel !== undefined
                        const optColor = isAnswered ? OPTION_COLORS[sel] : null

                        return (
                          <div key={q.id} className="px-5 py-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${!isAnswered ? 'border-slate-200 bg-white' : ''}`}
                                style={isAnswered ? { backgroundColor: optColor!, borderColor: optColor! } : {}}>
                                {isAnswered && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth={3.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {isAnswered && (
                                  <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full text-white mb-0.5"
                                    style={{ backgroundColor: optColor! }}>
                                    {ANSWER_OPTIONS.find(o => o.key === sel)?.label}
                                  </span>
                                )}
                                <p className="text-[14px] font-semibold text-slate-800 leading-snug">{q.text}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 mt-2 ml-[30px]">
                              {ANSWER_OPTIONS.map(opt => {
                                const isSelected = sel === opt.key
                                return (
                                  <div key={opt.key}
                                    className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border text-center select-none ${
                                      isSelected ? 'text-white border-transparent' : 'bg-white text-slate-300 border-slate-100'
                                    }`}
                                    style={isSelected ? {
                                      backgroundColor: OPTION_COLORS[opt.key],
                                      borderColor: OPTION_COLORS[opt.key],
                                    } : {}}>
                                    {opt.label}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 데스크톱 sticky 오른쪽 */}
            <div className="hidden lg:block w-[280px] shrink-0 sticky top-0"
              style={{ maxHeight: 'calc(100vh - 65px)', overflowY: 'auto' }}>
              {rightPanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
