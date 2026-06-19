'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import {
  QUESTIONS, CATEGORIES, ANSWER_OPTIONS,
  JOB_LABELS, JOB_LABELS_FLAT, type JobType,
} from '@/lib/survey-questions'
import { saveTutorComment, publishTutorComment, unpublishTutorComment, openDayAccess, closeDayAccess } from '@/app/actions/admin'
import type { StudentRow } from '@/app/actions/admin'
import { NEXT_STEPS_ITEMS } from '@/lib/types'

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

const STAGE_LABELS = ['체크리스트', 'DAY 1', '1차 면담', 'DAY 2+3', '2차 면담', '최종 정리', '완료']

type Props = {
  student: StudentRow
  onClose: () => void
}

export default function StudentDetailModal({ student, onClose }: Props) {
  const { answers, top_job, job_pcts, student_name, answered_count, cohort, stage } = student
  const chartColor = top_job ? JOB_COLORS[top_job] : '#94a3b8'
  const [tab, setTab] = useState<'checklist' | 'journey'>('checklist')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const hasJourneyData = (stage ?? 0) > 0 || !!student.day1_data || !!student.experiences

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

      <div className={`relative bg-slate-50 flex flex-col shadow-2xl transition-all duration-200 ${isFullscreen ? 'w-full' : 'ml-auto w-full max-w-4xl'}`}>
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
            <StageBadge stage={stage ?? 0} />
            <span className="shrink-0 text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full hidden sm:inline">
              관리자 보기
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button onClick={() => setIsFullscreen(prev => !prev)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={isFullscreen ? '축소' : '전체 화면'}>
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white border-b border-slate-100 px-5 flex gap-1 shrink-0">
          <button onClick={() => setTab('checklist')}
            className={`py-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              tab === 'checklist' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            📋 체크리스트
          </button>
          <button onClick={() => setTab('journey')}
            className={`py-2.5 px-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 ${
              tab === 'journey' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            🗺️ 진행 현황
            {hasJourneyData && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'journey' && (
            <div className={`px-5 py-5 space-y-5 ${isFullscreen ? 'max-w-5xl' : 'max-w-2xl'}`}>
              <JourneyView student={student} />
            </div>
          )}

          {tab === 'checklist' && <>
          <div className="lg:hidden px-4 pt-4">{rightPanel}</div>
          <div className="px-4 py-5 lg:flex lg:gap-5 lg:items-start">
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
            <div className="hidden lg:block w-[280px] shrink-0 sticky top-0"
              style={{ maxHeight: 'calc(100vh - 105px)', overflowY: 'auto' }}>
              {rightPanel}
            </div>
          </div>
          </>}
        </div>
      </div>
    </div>
  )
}

// ── 진행 현황 탭 ──────────────────────────────────────────────────

function StageBadge({ stage }: { stage: number }) {
  const config: Record<number, { label: string; color: string }> = {
    0: { label: 'DAY1 준비 중', color: '#94a3b8' },
    1: { label: 'DAY1 완료 · 1차 면담 대기', color: '#f97316' },
    2: { label: 'DAY2+3 진행 중', color: '#3b82f6' },
    3: { label: 'DAY2+3 완료 · 2차 면담 대기', color: '#f97316' },
    4: { label: '최종 정리 중', color: '#8b5cf6' },
    5: { label: '전체 완료 ✅', color: '#10b981' },
  }
  const c = config[stage] ?? config[0]
  return (
    <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border"
      style={{ color: c.color, borderColor: `${c.color}50`, backgroundColor: `${c.color}10` }}>
      {c.label}
    </span>
  )
}

function JourneyView({ student }: { student: StudentRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [comment1, setComment1] = useState(student.tutor_comment_1 ?? '')
  const [editing1, setEditing1] = useState(!student.tutor_comment_1)
  const [saveResult1, setSaveResult1] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [confirm1, setConfirm1] = useState<'publish' | 'unpublish' | null>(null)

  const [comment2, setComment2] = useState(student.tutor_comment_2 ?? '')
  const [editing2, setEditing2] = useState(!student.tutor_comment_2)
  const [saveResult2, setSaveResult2] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [confirm2, setConfirm2] = useState<'publish' | 'unpublish' | null>(null)

  const [stageConfirm, setStageConfirm] = useState<{
    day: '23' | '5'
    action: 'open' | 'close'
    step: 1 | 2
  } | null>(null)

  const currentStage = student.stage ?? 0

  const handleSave = (num: 1 | 2) => {
    const val = num === 1 ? comment1 : comment2
    if (!val.trim()) return
    startTransition(async () => {
      const result = await saveTutorComment(student.id, 1, num, val)
      if (result.success) {
        if (num === 1) { setSaveResult1({ ok: true }); setEditing1(false) }
        else { setSaveResult2({ ok: true }); setEditing2(false) }
        setTimeout(() => { router.refresh() }, 800)
      } else {
        if (num === 1) setSaveResult1({ error: result.error })
        else setSaveResult2({ error: result.error })
      }
    })
  }

  const handleStageChange = (day: '23' | '5', action: 'open' | 'close') => {
    startTransition(async () => {
      const result = action === 'open'
        ? await openDayAccess(student.id, 1, day)
        : await closeDayAccess(student.id, 1, day)
      if (result.success) {
        setStageConfirm(null)
        setTimeout(() => { router.refresh() }, 500)
      }
    })
  }

  const handlePublish = (num: 1 | 2) => {
    startTransition(async () => {
      const result = await publishTutorComment(student.id, 1, num)
      if (result.success) {
        if (num === 1) setConfirm1(null)
        else setConfirm2(null)
        setTimeout(() => { router.refresh() }, 500)
      }
    })
  }

  const handleUnpublish = (num: 1 | 2) => {
    startTransition(async () => {
      const result = await unpublishTutorComment(student.id, 1, num)
      if (result.success) {
        if (num === 1) setConfirm1(null)
        else setConfirm2(null)
        setTimeout(() => { router.refresh() }, 500)
      }
    })
  }

  // 진행 단계 스테퍼
  const STEPS = ['체크리스트', 'DAY 1', '1차 면담', 'DAY 2+3', '2차 면담', '최종 정리']
  const completedUpTo = currentStage

  return (
    <div className="space-y-5">
      {/* 진행 단계 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">진행 단계</p>
        <div className="flex items-center gap-0 flex-wrap gap-y-2">
          {STEPS.map((label, i) => {
            const done = i < completedUpTo
            const active = i === completedUpTo
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${done ? 'bg-emerald-500 text-white' :
                      active ? 'bg-slate-900 text-white' :
                      'bg-slate-100 text-slate-400'}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 mb-3.5 ${i < completedUpTo ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 단계 접근 제어 */}
      {currentStage >= 1 && currentStage <= 4 && (
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-3">🔑 단계 접근 제어</p>

          {stageConfirm ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {stageConfirm.step === 1 ? '확인 1/2' : '확인 2/2 — 마지막 확인'}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {stageConfirm.action === 'open'
                  ? `DAY ${stageConfirm.day === '23' ? '2+3' : '5'} 접근을 열겠습니까?`
                  : `DAY ${stageConfirm.day === '23' ? '2+3' : '5'} 접근을 닫겠습니까?`
                }
              </p>
              <p className="text-xs text-slate-500">
                {stageConfirm.step === 1
                  ? (stageConfirm.action === 'open'
                    ? `수강생이 DAY ${stageConfirm.day === '23' ? '2+3' : '5'} 단계에 접근할 수 있게 됩니다.`
                    : `수강생의 DAY ${stageConfirm.day === '23' ? '2+3' : '5'} 접근이 차단됩니다.`)
                  : (stageConfirm.action === 'open'
                    ? '예를 누르면 즉시 접근이 열립니다. 나중에 다시 닫을 수 있습니다.'
                    : '예를 누르면 즉시 접근이 차단됩니다. 나중에 다시 열 수 있습니다.')
                }
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStageConfirm(null)}
                  className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50">
                  취소
                </button>
                <button
                  onClick={() => {
                    if (stageConfirm.step === 1) {
                      setStageConfirm({ ...stageConfirm, step: 2 })
                    } else {
                      handleStageChange(stageConfirm.day, stageConfirm.action)
                    }
                  }}
                  disabled={isPending}
                  className={`flex-1 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors ${
                    stageConfirm.action === 'open'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-500 hover:bg-amber-600'
                  }`}>
                  {stageConfirm.step === 1
                    ? '예, 계속하기 →'
                    : (stageConfirm.action === 'open' ? '예, 지금 열기' : '예, 지금 닫기')
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentStage === 1 && (
                <button
                  onClick={() => setStageConfirm({ day: '23', action: 'open', step: 1 })}
                  className="w-full border-2 border-blue-200 text-blue-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                  🔓 DAY 2+3 열기 — 수강생 접근 허용
                </button>
              )}
              {currentStage === 2 && (
                <button
                  onClick={() => setStageConfirm({ day: '23', action: 'close', step: 1 })}
                  className="w-full border-2 border-amber-200 text-amber-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                  🔒 DAY 2+3 닫기 — 수강생 접근 차단
                </button>
              )}
              {currentStage === 3 && (
                <button
                  onClick={() => setStageConfirm({ day: '5', action: 'open', step: 1 })}
                  className="w-full border-2 border-blue-200 text-blue-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                  🔓 DAY 5 열기 — 수강생 접근 허용
                </button>
              )}
              {currentStage === 4 && (
                <button
                  onClick={() => setStageConfirm({ day: '5', action: 'close', step: 1 })}
                  className="w-full border-2 border-amber-200 text-amber-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                  🔒 DAY 5 닫기 — 수강생 접근 차단
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1차 면담 메모 (stage >= 1) */}
      {currentStage >= 1 && (
        <div className={`bg-white rounded-2xl border p-4 ${editing1 ? 'border-orange-100' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-semibold ${editing1 ? 'text-orange-600' : 'text-slate-600'}`}>
              📝 1차 면담 메모
            </p>
            {!editing1 && (
              <button onClick={() => setEditing1(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">
                수정
              </button>
            )}
          </div>
          {editing1 ? (
            <>
              <p className="text-xs text-slate-400 mb-3">메모 용도입니다. 저장 후 수강생에게 공개할 수 있습니다.</p>
              <textarea
                value={comment1}
                onChange={e => setComment1(e.target.value)}
                rows={4}
                placeholder="면담 내용 요약, 다음 단계 가이드, 추가 고려 사항 등..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none mb-3"
              />
              {saveResult1 && (
                <p className={`text-xs mb-2 ${saveResult1.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {saveResult1.ok ? '✓ 저장됐어요.' : saveResult1.error}
                </p>
              )}
              <div className="flex gap-2">
                {student.tutor_comment_1 && (
                  <button onClick={() => { setEditing1(false); setComment1(student.tutor_comment_1 ?? '') }}
                    className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">
                    취소
                  </button>
                )}
                <button
                  onClick={() => handleSave(1)}
                  disabled={isPending || !comment1.trim()}
                  className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40">
                  {isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{comment1}</p>
          )}

          {/* 공개 제어 */}
          {!editing1 && comment1 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              {currentStage < 2 ? (
                confirm1 === 'publish' ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-blue-800">이 메모를 수강생에게 공개하겠습니까?</p>
                    <p className="text-xs text-blue-600">수강생에게 DAY 2+3 단계가 열립니다.</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handlePublish(1)} disabled={isPending}
                        className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50">
                        예, 공개하기
                      </button>
                      <button onClick={() => setConfirm1(null)}
                        className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirm1('publish')}
                    className="w-full border-2 border-blue-200 text-blue-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                    👁 수강생에게 보이도록 하기
                  </button>
                )
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-medium">✓ 수강생에게 공개됨</span>
                  {currentStage === 2 && (
                    confirm1 === 'unpublish' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-amber-700">숨기겠습니까?</span>
                        <button onClick={() => handleUnpublish(1)} disabled={isPending}
                          className="text-xs text-white bg-amber-500 px-2.5 py-1 rounded-lg disabled:opacity-50">
                          확인
                        </button>
                        <button onClick={() => setConfirm1(null)}
                          className="text-xs text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50">
                          취소
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirm1('unpublish')}
                        className="text-xs text-slate-400 hover:text-amber-600 underline transition-colors">
                        숨기기
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2차 면담 메모 (stage >= 3) */}
      {currentStage >= 3 && (
        <div className={`bg-white rounded-2xl border p-4 ${editing2 ? 'border-orange-100' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-semibold ${editing2 ? 'text-orange-600' : 'text-slate-600'}`}>
              📝 2차 면담 메모
            </p>
            {!editing2 && (
              <button onClick={() => setEditing2(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">
                수정
              </button>
            )}
          </div>
          {editing2 ? (
            <>
              <p className="text-xs text-slate-400 mb-3">메모 용도입니다. 저장 후 수강생에게 공개할 수 있습니다.</p>
              <textarea
                value={comment2}
                onChange={e => setComment2(e.target.value)}
                rows={4}
                placeholder="면담 내용 요약, 다음 단계 가이드, 추가 고려 사항 등..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none mb-3"
              />
              {saveResult2 && (
                <p className={`text-xs mb-2 ${saveResult2.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {saveResult2.ok ? '✓ 저장됐어요.' : saveResult2.error}
                </p>
              )}
              <div className="flex gap-2">
                {student.tutor_comment_2 && (
                  <button onClick={() => { setEditing2(false); setComment2(student.tutor_comment_2 ?? '') }}
                    className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">
                    취소
                  </button>
                )}
                <button
                  onClick={() => handleSave(2)}
                  disabled={isPending || !comment2.trim()}
                  className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40">
                  {isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{comment2}</p>
          )}

          {/* 공개 제어 */}
          {!editing2 && comment2 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              {currentStage < 4 ? (
                confirm2 === 'publish' ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-blue-800">이 메모를 수강생에게 공개하겠습니까?</p>
                    <p className="text-xs text-blue-600">수강생에게 최종 정리(DAY 5) 단계가 열립니다.</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handlePublish(2)} disabled={isPending}
                        className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50">
                        예, 공개하기
                      </button>
                      <button onClick={() => setConfirm2(null)}
                        className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirm2('publish')}
                    className="w-full border-2 border-blue-200 text-blue-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                    👁 수강생에게 보이도록 하기
                  </button>
                )
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-medium">✓ 수강생에게 공개됨</span>
                  {currentStage === 4 && (
                    confirm2 === 'unpublish' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-amber-700">숨기겠습니까?</span>
                        <button onClick={() => handleUnpublish(2)} disabled={isPending}
                          className="text-xs text-white bg-amber-500 px-2.5 py-1 rounded-lg disabled:opacity-50">
                          확인
                        </button>
                        <button onClick={() => setConfirm2(null)}
                          className="text-xs text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50">
                          취소
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirm2('unpublish')}
                        className="text-xs text-slate-400 hover:text-amber-600 underline transition-colors">
                        숨기기
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DAY 1 데이터 */}
      {student.day1_data && Object.values(student.day1_data as Record<string, unknown>).some(v => typeof v === 'string' && v.trim()) && (
        <DayDataBlock title="📅 DAY 1 | 나의 경험 꺼내기" fields={[
          { key: 'work',              label: '💼 일/알바/직장 경험' },
          { key: 'school',            label: '🎓 학교/학습 경험' },
          { key: 'personal',          label: '🌱 개인 활동' },
          { key: 'camp_basic_role',   label: '🏕️ 기초 PJT — 역할' },
          { key: 'camp_basic_made',   label: '🏕️ 기초 PJT — 만든 것' },
          { key: 'camp_basic_memory', label: '🏕️ 기초 PJT — 기억에 남는 것' },
          { key: 'camp_adv_role',     label: '🏕️ 심화 PJT — 역할' },
          { key: 'camp_adv_made',     label: '🏕️ 심화 PJT — 만든 것' },
          { key: 'camp_adv_memory',   label: '🏕️ 심화 PJT — 기억에 남는 것' },
          { key: 'energy_flow',       label: '⚡ 몰입했던 순간' },
          { key: 'good_at',           label: '✨ 잘한다고 느꼈던 순간' },
          { key: 'dislike',           label: '😣 하기 싫었던 것' },
          { key: 'today_discovery',   label: '✅ 오늘의 발견' },
        ]} data={student.day1_data as Record<string, string>} />
      )}

      {/* 다음 단계 자기 체크 현황 */}
      <NextStepsAdminBlock day1Data={student.day1_data} />

      {/* DAY 2+3 데이터 */}
      {student.day23_data && Object.values(student.day23_data).some(v => v && String(v).trim()) && (
        <DayDataBlock title="📅 DAY 2+3 | 마케터 탐색 + 취업 방향" fields={[
          { key: 'curriculum',        label: '📚 커리큘럼 체크' },
          { key: 'work_style',        label: '🎯 업무 스타일' },
          { key: 'strengths',         label: '💪 강점 초안' },
          { key: 'marketer_sentence', label: '✍️ 한 문장 완성' },
          { key: 'target_job_1',      label: '🥇 1순위 직무' },
          { key: 'target_job_2',      label: '🥈 2순위 직무' },
          { key: 'industries',        label: '🏭 관심 산업' },
          { key: 'industry_connection', label: '🔗 DAY1 경험 연결' },
          { key: 'work_env_type',     label: '🏢 대행사 vs 인하우스' },
          { key: 'work_env_size',     label: '🏢 회사 규모' },
          { key: 'target_jd_url',     label: '📄 목표 JD 링크' },
          { key: 'target_jd_note',    label: '📝 JD 메모' },
          { key: 'compass_draft',     label: '🧭 취업 나침반 초안' },
        ]} data={serializeDay23(student.day23_data as Record<string, unknown>)} />
      )}

      {/* DAY 5 데이터 */}
      {student.day5_data && Object.values(student.day5_data).some(v => v && String(v).trim()) && (
        <DayDataBlock title="📅 DAY 5 | 나의 취업 나침반 완성" fields={[
          { key: 'compass_who', label: '🙋 나는 어떤 사람인가' },
          { key: 'compass_where', label: '🎯 나는 어디로 가는가' },
          { key: 'compass_why', label: '💬 나는 왜 이 방향인가' },
          { key: 'future_efforts', label: '💭 앞으로의 노력' },
        ]} data={student.day5_data as Record<string, string>} />
      )}

      {/* 레거시 경험 데이터 */}
      {student.experiences && !student.day1_data && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">📄 이전 버전 경험 정리 데이터</p>
          {Object.entries(student.experiences)
            .filter(([, v]) => v?.trim())
            .map(([k, v]) => (
              <div key={k} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold text-slate-500 mb-1">{k}</p>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {v}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 아무 데이터 없을 때 */}
      {!student.day1_data && !student.experiences && currentStage === 0 && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">아직 경험 정리를 작성하지 않았어요</p>
        </div>
      )}
    </div>
  )
}

function NextStepsAdminBlock({ day1Data }: { day1Data: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ns = (day1Data as any)?.next_steps as Record<string, boolean> | undefined
  if (!ns || Object.keys(ns).length === 0) return null
  const doneCount = NEXT_STEPS_ITEMS.filter(item => ns[item]).length
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">✅ 다음 단계 진행 현황</p>
        <p className="text-xs text-slate-400 font-medium">{doneCount} / {NEXT_STEPS_ITEMS.length}</p>
      </div>
      <div className="p-4 space-y-2">
        {NEXT_STEPS_ITEMS.map(item => {
          const checked = ns[item] ?? false
          return (
            <div key={item} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'
              }`}>
                {checked && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs leading-relaxed ${checked ? 'text-emerald-700 line-through' : 'text-slate-500'}`}>
                {item}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function serializeDay23(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  const STR_KEYS = ['strengths', 'marketer_sentence', 'target_job_1', 'target_job_2',
    'industries', 'industry_connection', 'target_jd_url', 'target_jd_note', 'compass_draft']
  for (const k of STR_KEYS) {
    if (typeof raw[k] === 'string') result[k] = raw[k] as string
  }
  if (Array.isArray(raw.curriculum)) {
    const AREAS = ['광고 기획', 'AI 활용 콘텐츠', '비주얼 전략', '퍼포먼스 마케팅', '데이터 분석', '그로스 마케팅', '글쓰기/카피', '캠페인 기획']
    result.curriculum = (raw.curriculum as {interesting:boolean;good_at:boolean;boring:boolean;comment:string}[])
      .map((r, i) => {
        const tags = [r.interesting && '흥미', r.good_at && '잘했다', r.boring && '별로'].filter(Boolean).join('/')
        return `${AREAS[i] ?? i}: ${tags || '-'}${r.comment ? ' · ' + r.comment : ''}`
      }).join('\n')
  }
  if (Array.isArray(raw.work_style)) {
    const AB = [['숫자·분석','기획·크리에이티브'],['빠른 실행','깊이 있는 사고'],['혼자 집중','협업·소통'],['즉각 성과','장기 전략']]
    result.work_style = (raw.work_style as {score:string;comment:string}[])
      .map((r, i) => `${AB[i]?.[0]}(${r.score||'-'})${AB[i]?.[1]}${r.comment ? ' · '+r.comment : ''}`).join('\n')
  }
  if (Array.isArray(raw.work_env_type)) {
    result.work_env_type = (raw.work_env_type as {choice:string;reason:string}[])
      .map((r, i) => `${['대행사','인하우스'][i]}: ${r.choice||'-'}${r.reason ? ' · '+r.reason : ''}`).join('\n')
  }
  if (Array.isArray(raw.work_env_size)) {
    result.work_env_size = (raw.work_env_size as {choice:string;reason:string}[])
      .map((r, i) => `${['스타트업','중소기업','중견·대기업'][i]}: ${r.choice||'-'}${r.reason ? ' · '+r.reason : ''}`).join('\n')
  }
  return result
}

function DayDataBlock({ title, fields, data }: {
  title: string
  fields: { key: string; label: string }[]
  data: Record<string, string>
}) {
  const filled = fields.filter(f => data[f.key]?.trim())
  if (!filled.length) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
      </div>
      <div className="p-4 space-y-4">
        {filled.map(f => (
          <div key={f.key}>
            <p className="text-xs font-semibold text-slate-500 mb-1">{f.label}</p>
            {f.key === 'target_jd_url' ? (
              <a href={data[f.key]} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 underline break-all">
                {data[f.key]}
              </a>
            ) : (
              <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
                {data[f.key]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
