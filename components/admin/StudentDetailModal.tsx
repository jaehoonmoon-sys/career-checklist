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
import { saveTutorComment } from '@/app/actions/admin'
import type { StudentRow } from '@/app/actions/admin'
import { NEXT_STEPS_ITEMS, type Day23Data, type Day5Data } from '@/lib/types'
import { DEFAULT_FORM_CONFIG } from '@/lib/form-config'
import { Day23ReviewContent } from '@/components/student/CareerJourneyView'

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
  const { answers, top_job, job_pcts, student_name, answered_count, cohort, stage } = student
  const chartColor = top_job ? JOB_COLORS[top_job] : '#94a3b8'
  const [tab, setTab] = useState<'checklist' | 'day1' | 'day23' | 'day5'>('checklist')
  const [isFullscreen, setIsFullscreen] = useState(false)

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
        <div className="bg-white border-b border-slate-100 px-5 flex gap-1 shrink-0 overflow-x-auto">
          {([
            { id: 'checklist', label: '📋 체크리스트' },
            { id: 'day1',      label: '📝 DAY 1' },
            { id: 'day23',     label: '🗺️ DAY 2+3' },
            { id: 'day5',      label: '🏁 DAY 5' },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`py-2.5 px-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 체크리스트 탭 */}
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
                                      style={isSelected ? { backgroundColor: OPTION_COLORS[opt.key], borderColor: OPTION_COLORS[opt.key] } : {}}>
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

          {/* DAY 1 탭 */}
          {tab === 'day1' && (
            <div className={`px-5 py-5 space-y-5 ${isFullscreen ? 'max-w-5xl' : 'max-w-2xl'}`}>
              <Day1AdminPanel student={student} />
            </div>
          )}

          {/* DAY 2+3 탭 */}
          {tab === 'day23' && (
            <div className={`px-5 py-5 space-y-5 ${isFullscreen ? 'max-w-5xl' : 'max-w-2xl'}`}>
              <Day23AdminPanel student={student} />
            </div>
          )}

          {/* DAY 5 탭 */}
          {tab === 'day5' && (
            <div className={`px-5 py-5 space-y-5 ${isFullscreen ? 'max-w-5xl' : 'max-w-2xl'}`}>
              <Day5AdminPanel student={student} />
            </div>
          )}
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

// ── Day 1 관리자 탭 ──────────────────────────────────────────────

function Day1AdminPanel({ student }: { student: StudentRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [comment1, setComment1] = useState(student.tutor_comment_1 ?? '')
  const [editing1, setEditing1] = useState(!student.tutor_comment_1)
  const [saveResult1, setSaveResult1] = useState<{ ok?: boolean; error?: string } | null>(null)
  const currentStage = student.stage ?? 0

  const handleSave = () => {
    if (!comment1.trim()) return
    startTransition(async () => {
      const result = await saveTutorComment(student.id, 1, 1, comment1)
      if (result.success) { setSaveResult1({ ok: true }); setEditing1(false); setTimeout(() => router.refresh(), 800) }
      else setSaveResult1({ error: result.error })
    })
  }

  return (
    <div className="space-y-5">
      {/* 진행 단계 */}
      <StageStepperBlock stage={currentStage} />

      {/* 1차 면담 메모 */}
      {currentStage >= 1 && (
        <div className={`bg-white rounded-2xl border p-4 ${editing1 ? 'border-orange-100' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-semibold ${editing1 ? 'text-orange-600' : 'text-slate-600'}`}>📝 1차 면담 메모</p>
            {!editing1 && <button onClick={() => setEditing1(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">수정</button>}
          </div>
          {editing1 ? (
            <>
              <p className="text-xs text-slate-400 mb-3">메모 용도입니다. 저장 후 수강생에게 공개할 수 있습니다.</p>
              <textarea value={comment1} onChange={e => setComment1(e.target.value)} rows={4}
                placeholder="면담 내용 요약, 다음 단계 가이드, 추가 고려 사항 등..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none mb-3" />
              {saveResult1 && (
                <p className={`text-xs mb-2 ${saveResult1.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {saveResult1.ok ? '✓ 저장됐어요.' : saveResult1.error}
                </p>
              )}
              <div className="flex gap-2">
                {student.tutor_comment_1 && (
                  <button onClick={() => { setEditing1(false); setComment1(student.tutor_comment_1 ?? '') }}
                    className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">취소</button>
                )}
                <button onClick={handleSave} disabled={isPending || !comment1.trim()}
                  className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40">
                  {isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{comment1}</p>
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

      <NextStepsAdminBlock day1Data={student.day1_data} />

      {currentStage === 0 && !student.day1_data && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">아직 DAY 1을 작성하지 않았어요</p>
        </div>
      )}
    </div>
  )
}

// ── Day 2+3 관리자 탭 ─────────────────────────────────────────────

function Day23AdminPanel({ student }: { student: StudentRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [comment2, setComment2] = useState(student.tutor_comment_2 ?? '')
  const [editing2, setEditing2] = useState(!student.tutor_comment_2)
  const [saveResult2, setSaveResult2] = useState<{ ok?: boolean; error?: string } | null>(null)
  const currentStage = student.stage ?? 0

  const handleSave = () => {
    if (!comment2.trim()) return
    startTransition(async () => {
      const result = await saveTutorComment(student.id, 1, 2, comment2)
      if (result.success) { setSaveResult2({ ok: true }); setEditing2(false); setTimeout(() => router.refresh(), 800) }
      else setSaveResult2({ error: result.error })
    })
  }

  const d23 = student.day23_data as Day23Data | null

  return (
    <div className="space-y-5">
      {/* 2차 면담 메모 (stage >= 3) */}
      {currentStage >= 3 && (
        <div className={`bg-white rounded-2xl border p-4 ${editing2 ? 'border-orange-100' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-semibold ${editing2 ? 'text-orange-600' : 'text-slate-600'}`}>📝 2차 면담 메모</p>
            {!editing2 && <button onClick={() => setEditing2(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">수정</button>}
          </div>
          {editing2 ? (
            <>
              <p className="text-xs text-slate-400 mb-3">메모 용도입니다. 저장 후 수강생에게 공개할 수 있습니다.</p>
              <textarea value={comment2} onChange={e => setComment2(e.target.value)} rows={4}
                placeholder="면담 내용 요약, 다음 단계 가이드, 추가 고려 사항 등..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none mb-3" />
              {saveResult2 && (
                <p className={`text-xs mb-2 ${saveResult2.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {saveResult2.ok ? '✓ 저장됐어요.' : saveResult2.error}
                </p>
              )}
              <div className="flex gap-2">
                {student.tutor_comment_2 && (
                  <button onClick={() => { setEditing2(false); setComment2(student.tutor_comment_2 ?? '') }}
                    className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">취소</button>
                )}
                <button onClick={handleSave} disabled={isPending || !comment2.trim()}
                  className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40">
                  {isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{comment2}</p>
          )}
        </div>
      )}

      {/* DAY 2+3 시각적 데이터 */}
      {currentStage >= 2 ? (
        d23 && Object.values(d23).some(v =>
          Array.isArray(v)
            ? v.some(row => typeof row === 'object' && row !== null && Object.values(row).some(Boolean))
            : typeof v === 'string' && v.trim() !== ''
        ) ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-700 mb-4">📅 DAY 2+3 제출 내용</p>
            <Day23ReviewContent day23Data={d23} formConfig={DEFAULT_FORM_CONFIG} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">📅 DAY 2+3 제출 내용</p>
            <p className="text-sm text-slate-300">아직 제출하지 않았어요</p>
          </div>
        )
      ) : (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="text-sm">DAY 2+3 단계가 아직 열리지 않았어요</p>
        </div>
      )}
    </div>
  )
}

// ── Day 5 관리자 탭 ──────────────────────────────────────────────

function Day5AdminPanel({ student }: { student: StudentRow }) {
  const currentStage = student.stage ?? 0
  const d5 = student.day5_data as Day5Data | null
  const textKeys: (keyof Day5Data)[] = ['compass_who', 'compass_where', 'compass_why', 'future_efforts']
  const hasD5 = d5 && textKeys.some(k => typeof d5[k] === 'string' && (d5[k] as string).trim())

  return (
    <div className="space-y-5">
      {currentStage >= 4 ? (
        hasD5 && d5 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-700">📅 DAY 5 | 나의 취업 나침반 완성</p>
            {([
              { key: 'compass_who',    label: '🙋 나는 어떤 사람인가' },
              { key: 'compass_where',  label: '🎯 나는 어디로 가는가' },
              { key: 'compass_why',    label: '💬 나는 왜 이 방향인가' },
              { key: 'future_efforts', label: '💭 앞으로의 노력' },
            ] as const).map(({ key, label }) => {
              const val = d5[key] as string
              return val?.trim() ? (
                <div key={key}>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{val}</div>
                </div>
              ) : null
            })}
            {d5.pre_checklist && Object.keys(d5.pre_checklist).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">✅ 세션 전 체크리스트</p>
                <div className="space-y-1.5">
                  {Object.entries(d5.pre_checklist).map(([item, checked]) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-xs ${checked ? 'text-emerald-700 line-through' : 'text-slate-500'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">📅 DAY 5 제출 내용</p>
            <p className="text-sm text-slate-300">아직 제출하지 않았어요</p>
          </div>
        )
      ) : (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2">🏁</p>
          <p className="text-sm">DAY 5 단계가 아직 열리지 않았어요</p>
        </div>
      )}
    </div>
  )
}

// ── 공통 단계 스테퍼 ──────────────────────────────────────────────

function StageStepperBlock({ stage }: { stage: number }) {
  const STEPS = ['체크리스트', 'DAY 1', '1차 면담', 'DAY 2+3', '2차 면담', '최종 정리']
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <p className="text-xs font-semibold text-slate-600 mb-3">진행 단계</p>
      <div className="flex items-center flex-wrap gap-y-2">
        {STEPS.map((label, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mb-3.5 ${i < stage ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
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
