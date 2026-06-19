'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { JOB_LABELS_FLAT, type JobType } from '@/lib/survey-questions'
import { saveDay23, saveDay5, updateDay23Data, updateDay5Data, rollbackStage, type RollbackTarget } from '@/app/actions/checklist'
import {
  type Day1Data, type Day23Data, type Day5Data,
  EMPTY_DAY23, EMPTY_DAY5,
  type CurrRow, type WsRow, type WenvRow,
} from '@/lib/types'
import { type FormConfig, DEFAULT_FORM_CONFIG, FIXED_DAY1_IDS } from '@/lib/form-config'
import CompetencyChecklist from './CompetencyChecklist'
import { Day1FormScreen, NextStepsChecklist } from './PostSaveFlow'

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}


const JOB_ORDER: JobType[] = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']


type Props = {
  stage: number
  studentName: string
  sessionRound: number
  topJob: JobType | null
  topJobPct: number
  jobPcts: Record<JobType, number>
  answers: Record<string, number>
  day1Data: Day1Data
  day23Data: Day23Data
  day5Data: Day5Data
  tutorComment1: string | null
  tutorComment2: string | null
  formConfig?: FormConfig
}

type EditMode = 'none' | 'checklist' | 'day1' | 'day23' | 'day5'

export default function CareerJourneyView({
  stage, studentName, sessionRound, topJob, topJobPct, jobPcts, answers,
  day1Data, day23Data, day5Data, tutorComment1, tutorComment2, formConfig,
}: Props) {
  const router = useRouter()
  const [currentStage] = useState(stage)
  const [showRollback, setShowRollback] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('none')

  // ─── 체크리스트 수정 모드: 전체 화면 교체 ────────────────────
  if (currentStage >= 1 && editMode === 'checklist') {
    return (
      <CompetencyChecklist
        initialAnswers={answers}
        initialDay1={day1Data}
        sessionRound={sessionRound}
        studentName={studentName}
        formConfig={formConfig}
        onAfterSave={() => { setEditMode('none'); router.refresh() }}
      />
    )
  }

  // ─── Stage 2: DAY 2+3 폼 ────────────────────────────────────
  if (currentStage === 2) {
    return (
      <>
        <Day23FormScreen
          studentName={studentName}
          sessionRound={sessionRound}
          topJob={topJob}
          initialData={day23Data}
          tutorComment={tutorComment1}
          formConfig={formConfig}
          onComplete={() => router.refresh()}
          onRollbackRequest={() => setShowRollback(true)}
        />
        {showRollback && (
          <RollbackModal
            currentStage={currentStage}
            sessionRound={sessionRound}
            onClose={() => { setShowRollback(false); router.refresh() }}
          />
        )}
      </>
    )
  }

  // ─── Stage 4: DAY 5 폼 ───────────────────────────────────────
  if (currentStage === 4) {
    return (
      <>
        <Day5FormScreen
          studentName={studentName}
          sessionRound={sessionRound}
          initialData={day5Data}
          tutorComment={tutorComment2}
          onComplete={() => router.refresh()}
          onRollbackRequest={() => setShowRollback(true)}
        />
        {showRollback && (
          <RollbackModal
            currentStage={currentStage}
            sessionRound={sessionRound}
            onClose={() => { setShowRollback(false); router.refresh() }}
          />
        )}
      </>
    )
  }

  // ─── Stage 1+: 리뷰 화면 ────────────────────────────────────
  if (currentStage >= 1) {
    const topJobColor = topJob ? JOB_COLORS[topJob] : '#64748b'

    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">{studentName}님</span>
            <button onClick={() => setShowRollback(true)}
              className="text-xs text-slate-400 hover:text-amber-600 transition-colors">
              ↩ 초기화
            </button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 py-6 pb-16 lg:flex lg:gap-6 lg:items-start">

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0 space-y-4">

              {/* 튜터 메모 */}
            {tutorComment1 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-emerald-700 mb-2">💬 튜터님 메모</p>
                <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed break-words">{tutorComment1}</p>
              </div>
            )}
            {tutorComment2 && currentStage >= 3 && (
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-purple-700 mb-2">💬 2차 면담 메모</p>
                <p className="text-sm text-purple-800 whitespace-pre-wrap leading-relaxed break-words">{tutorComment2}</p>
              </div>
            )}

          {/* 직무 적합도 결과 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">📊 직무 적합도 결과</p>
                <button onClick={() => setEditMode('checklist')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
                  수정하기
                </button>
              </div>

              {topJob && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4"
                  style={{ backgroundColor: `${topJobColor}14` }}>
                  <span className="text-xs text-slate-500">1위</span>
                  <span className="text-sm font-bold" style={{ color: topJobColor }}>
                    {JOB_LABELS_FLAT[topJob]}
                  </span>
                  <span className="text-sm font-semibold ml-auto" style={{ color: topJobColor }}>
                    {topJobPct}%
                  </span>
                </div>
              )}

              <div className="space-y-2.5">
                {JOB_ORDER.map(job => (
                  <div key={job} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-20 shrink-0 truncate">
                      {JOB_LABELS_FLAT[job]}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${jobPcts[job]}%`, backgroundColor: JOB_COLORS[job] }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-8 text-right shrink-0">
                      {jobPcts[job]}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DAY 2+3 카드 (stage 3 이상) */}
            {currentStage >= 3 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-800">🗺️ DAY 2+3 마케터 탐색 + 취업 방향</p>
                  <button onClick={() => setEditMode('day23')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
                    수정하기
                  </button>
                </div>
                <div className="space-y-4">
                  {([
                    { key: 'target_job_1',       label: '🥇 1순위 직무',          val: day23Data.target_job_1 },
                    { key: 'target_job_2',       label: '🥈 2순위 직무',          val: day23Data.target_job_2 },
                    { key: 'strengths',          label: '💪 강점 초안',           val: day23Data.strengths },
                    { key: 'marketer_sentence',  label: '✍️ 나는 어떤 마케터인가', val: day23Data.marketer_sentence },
                    { key: 'compass_draft',      label: '🧭 취업 나침반 초안',     val: day23Data.compass_draft },
                  ] as const).map(({ key, label, val }) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
                      {val?.trim() ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{val}</p>
                      ) : (
                        <p className="text-sm text-slate-300 italic">작성하지 않았어요</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DAY 5 카드 (stage 5 이상) */}
            {currentStage >= 5 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-800">🏁 DAY 5 나의 취업 나침반</p>
                  <button onClick={() => setEditMode('day5')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
                    수정하기
                  </button>
                </div>
                <div className="space-y-4">
                  {([
                    { key: 'compass_who',    label: '🙋 나는 어떤 사람인가', val: day5Data.compass_who },
                    { key: 'compass_where',  label: '🎯 나는 어디로 가는가', val: day5Data.compass_where },
                    { key: 'compass_why',    label: '💬 나는 왜 이 방향인가', val: day5Data.compass_why },
                    { key: 'future_efforts', label: '💭 앞으로의 노력',       val: day5Data.future_efforts },
                  ] as const).map(({ key, label, val }) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
                      {val?.trim() ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{val}</p>
                      ) : (
                        <p className="text-sm text-slate-300 italic">작성하지 않았어요</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DAY 1 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">📝 DAY 1 나의 경험</p>
                <button onClick={() => setEditMode('day1')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
                  수정하기
                </button>
              </div>

              <div className="space-y-4">
                {(formConfig?.day1 ?? DEFAULT_FORM_CONFIG.day1).sections.flatMap(section =>
                  section.fields
                    .filter(f => f.type !== 'subtitle')
                    .map(f => ({
                      id: f.id,
                      label: f.label,
                      val: FIXED_DAY1_IDS.has(f.id)
                        ? ((day1Data[f.id as keyof Day1Data] as string) ?? '')
                        : (day1Data.extra_fields?.[f.id] ?? ''),
                    }))
                ).map(({ id, label, val }) => (
                  <div key={id}>
                    <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
                    {val?.trim() ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{val}</p>
                    ) : (
                      <p className="text-sm text-slate-300 italic">작성하지 않았어요</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 사이드바: 다음에 해볼 것들 */}
          <div className="w-full lg:w-64 shrink-0 mt-4 lg:mt-0 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-slate-800 mb-1">✅ 다음에 해볼 것들</p>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                경험 정리가 끝났으면 아래 항목들을 틈틈이 해보세요. 완료하면 체크!
              </p>
              <NextStepsChecklist
                initialNextSteps={day1Data.next_steps ?? {}}
                sessionRound={sessionRound}
              />
            </div>
          </div>

        </div>

        {/* DAY1 수정 오버레이 */}
        {editMode === 'day1' && (
          <Day1FormScreen
            topJob={topJob}
            sessionRound={sessionRound}
            initialDay1={day1Data}
            formConfig={formConfig}
            onComplete={() => { setEditMode('none'); router.refresh() }}
            onClose={() => setEditMode('none')}
          />
        )}

        {/* DAY2+3 수정 오버레이 */}
        {editMode === 'day23' && (
          <Day23FormScreen
            studentName={studentName}
            sessionRound={sessionRound}
            topJob={topJob}
            initialData={day23Data}
            tutorComment={tutorComment1}
            formConfig={formConfig}
            onComplete={() => { setEditMode('none'); router.refresh() }}
            onSave={(d) => updateDay23Data(sessionRound, d)}
            onRollbackRequest={() => setEditMode('none')}
          />
        )}

        {/* DAY5 수정 오버레이 */}
        {editMode === 'day5' && (
          <Day5FormScreen
            studentName={studentName}
            sessionRound={sessionRound}
            initialData={day5Data}
            tutorComment={tutorComment2}
            onComplete={() => { setEditMode('none'); router.refresh() }}
            onSave={(d) => updateDay5Data(sessionRound, d)}
            onRollbackRequest={() => setEditMode('none')}
          />
        )}

        {showRollback && (
          <RollbackModal
            currentStage={currentStage}
            sessionRound={sessionRound}
            onClose={() => setShowRollback(false)}
          />
        )}
      </div>
    )
  }

  return null
}

// ══════════════════════════════════════════════════════════════════
// DAY 2+3 폼
// ══════════════════════════════════════════════════════════════════

// ── D23 공통 헬퍼 ──────────────────────────────────────────────
function D23SectionHeader({ title, bgClass }: { title: string; bgClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full whitespace-nowrap ${bgClass}`}>{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}
function D23Card({ title, time, children }: { title: string; time?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800">
          {title}
          {time && <span className="text-xs font-normal text-slate-400 ml-1.5">({time})</span>}
        </p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}
function D23Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1">{label}</p>
      {hint && <p className="text-xs text-slate-400 mb-1.5 leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}
function D23Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 mb-2 leading-relaxed">
      {children}
    </div>
  )
}
function D23Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string; rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
      style={{ resize: 'none', overflow: 'hidden', minHeight: `${rows * 1.5}rem` }} />
  )
}
function CbCell({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
        checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-400'
      }`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}
function OXButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 justify-center">
      {['O', 'X'].map(v => (
        <button key={v} type="button" onClick={() => onChange(value === v ? '' : v)}
          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
            value === v
              ? v === 'O' ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}>
          {v}
        </button>
      ))}
    </div>
  )
}
function TdInput({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} placeholder="여기에 작성하세요" rows={1}
      className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:bg-slate-50 rounded px-1 py-0.5 block"
      style={{ resize: 'none', overflow: 'hidden', minHeight: '1.5rem' }} />
  )
}

// ── 기존 Day5 공용 헬퍼 (유지) ────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-slate-800 mb-1">{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 mb-2 leading-relaxed">{children}</p>
}
function Area({ value, onChange, placeholder, rows = 4 }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
      style={{ resize: 'none', overflow: 'hidden', minHeight: `${rows * 1.5}rem` }} />
  )
}

export function Day23FormScreen({ studentName, sessionRound, topJob, initialData, tutorComment, formConfig, onComplete, onSave, onRollbackRequest }: {
  studentName: string
  sessionRound: number
  topJob: JobType | null
  initialData: Day23Data
  tutorComment: string | null
  formConfig?: FormConfig
  onComplete: () => void
  onSave?: (data: Day23Data) => Promise<{ error?: string } | null | undefined>
  onRollbackRequest?: () => void
}) {
  const cfg = formConfig?.day23 ?? DEFAULT_FORM_CONFIG.day23
  const [data, setData] = useState<Day23Data>(initialData)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const setStr = (key: keyof Day23Data) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
    setData(prev => ({ ...prev, [key]: e.target.value }))

  const setCurr = (i: number, field: keyof CurrRow, val: boolean | string) =>
    setData(prev => {
      const curriculum = [...prev.curriculum] as CurrRow[]
      curriculum[i] = { ...curriculum[i], [field]: val }
      return { ...prev, curriculum }
    })

  const setWs = (i: number, field: keyof WsRow, val: string) =>
    setData(prev => {
      const work_style = [...prev.work_style] as WsRow[]
      work_style[i] = { ...work_style[i], [field]: val }
      return { ...prev, work_style }
    })

  const setWenv = (type: 'work_env_type' | 'work_env_size', i: number, field: keyof WenvRow, val: string) =>
    setData(prev => {
      const arr = [...prev[type]] as WenvRow[]
      arr[i] = { ...arr[i], [field]: val }
      return { ...prev, [type]: arr }
    })

  const handleSave = () => {
    startTransition(async () => {
      const result = await (onSave ? onSave(data) : saveDay23(sessionRound, data))
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10 shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-slate-500">{studentName}님</span>
          {onRollbackRequest ? (
            <button onClick={onRollbackRequest} className="text-xs text-slate-400 hover:text-amber-600 transition-colors">↩ 수정하기</button>
          ) : <span />}
        </div>
      </nav>

      <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">DAY 2+3</span>
          <h2 className="text-sm font-bold text-slate-900">나는 어떤 마케터인가? + 취업 방향</h2>
        </div>
        {topJob && (
          <p className="text-xs text-slate-400">
            체크리스트 결과: <span className="font-semibold" style={{ color: JOB_COLORS[topJob] }}>{JOB_LABELS_FLAT[topJob]}</span> 적합도 참고해서 작성해보세요
          </p>
        )}
      </div>

      {tutorComment && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 shrink-0">
          <p className="text-xs font-semibold text-emerald-700 mb-1">💬 튜터님 피드백</p>
          <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{tutorComment}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

          {/* ── DAY 2 ─────────────────────────────────────────── */}
          <D23SectionHeader title={cfg.day2_title} bgClass="bg-blue-600" />

          {/* 파트 1: 커리큘럼 체크 */}
          <D23Card title={cfg.card_curriculum} time="30분">
            <p className="text-xs text-slate-500">배운 영역 중 해당하는 칸에 체크하고, 한 줄 코멘트를 남겨보세요.</p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[38%]">영역</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-center w-16">흥미로웠다</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-center w-14">잘했다</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-center w-14">별로였다</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-left">한 줄 코멘트</th>
                  </tr>
                </thead>
                <tbody>
                  {cfg.curriculum_areas.map((area, i) => (
                    <tr key={area} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-2 text-slate-700 leading-snug">{area}</td>
                      <td className="px-2 py-2">
                        <CbCell checked={data.curriculum[i]?.interesting ?? false}
                          onChange={v => setCurr(i, 'interesting', v)} />
                      </td>
                      <td className="px-2 py-2">
                        <CbCell checked={data.curriculum[i]?.good_at ?? false}
                          onChange={v => setCurr(i, 'good_at', v)} />
                      </td>
                      <td className="px-2 py-2">
                        <CbCell checked={data.curriculum[i]?.boring ?? false}
                          onChange={v => setCurr(i, 'boring', v)} />
                      </td>
                      <td className="px-2 py-2">
                        <TdInput value={data.curriculum[i]?.comment ?? ''}
                          onChange={e => setCurr(i, 'comment', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </D23Card>

          {/* 파트 2: 업무 스타일 */}
          <D23Card title={cfg.card_workstyle} time="20분">
            <p className="text-xs text-slate-500">1(A쪽) ~ 5(B쪽)로 점수를 선택하고, 한 줄 코멘트를 적어보세요.</p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-right w-[26%]">A</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-center w-20">점수 (1→5)</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-left w-[26%]">B</th>
                    <th className="px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 text-left">코멘트</th>
                  </tr>
                </thead>
                <tbody>
                  {cfg.work_style_items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-2.5 text-slate-700 text-right">{item.a}</td>
                      <td className="px-2 py-2.5 text-center">
                        <select value={data.work_style[i]?.score ?? ''}
                          onChange={e => setWs(i, 'score', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded text-xs px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-300 w-12">
                          <option value="">-</option>
                          {['1','2','3','4','5'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2.5 text-slate-700">{item.b}</td>
                      <td className="px-2 py-2.5">
                        <TdInput value={data.work_style[i]?.comment ?? ''}
                          onChange={e => setWs(i, 'comment', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </D23Card>

          {/* 파트 3: 강점 & 한 문장 */}
          <D23Card title={cfg.card_strengths} time="10분">
            <D23Field label={cfg.strengths.label} hint={cfg.strengths.hint}>
              {cfg.strengths.callout && <D23Callout>{cfg.strengths.callout}</D23Callout>}
              <D23Textarea value={data.strengths} onChange={setStr('strengths')} rows={6}
                placeholder={cfg.strengths.placeholder} />
            </D23Field>
            <D23Field label={cfg.marketer_sentence.label} hint={cfg.marketer_sentence.hint}>
              <D23Textarea value={data.marketer_sentence} onChange={setStr('marketer_sentence')} rows={2}
                placeholder={cfg.marketer_sentence.placeholder} />
            </D23Field>
          </D23Card>

          {/* ── DAY 3 ─────────────────────────────────────────── */}
          <D23SectionHeader title={cfg.day3_title} bgClass="bg-indigo-600" />

          {/* 파트 1: 목표 직무 */}
          <D23Card title={cfg.card_target_job}>
            <D23Field label={cfg.target_job_1.label} hint={cfg.target_job_1.hint}>
              <D23Textarea value={data.target_job_1} onChange={setStr('target_job_1')} rows={3}
                placeholder={cfg.target_job_1.placeholder} />
            </D23Field>
            <D23Field label={cfg.target_job_2.label}>
              <D23Textarea value={data.target_job_2} onChange={setStr('target_job_2')} rows={2}
                placeholder={cfg.target_job_2.placeholder} />
            </D23Field>
          </D23Card>

          {/* 파트 2: 관심 산업 */}
          <D23Card title={cfg.card_industries}>
            <D23Field label={cfg.industries.label} hint={cfg.industries.hint}>
              <D23Textarea value={data.industries} onChange={setStr('industries')} rows={4}
                placeholder={cfg.industries.placeholder} />
            </D23Field>
            <D23Field label={cfg.industry_connection.label} hint={cfg.industry_connection.hint}>
              <D23Textarea value={data.industry_connection} onChange={setStr('industry_connection')} rows={3}
                placeholder={cfg.industry_connection.placeholder} />
            </D23Field>
          </D23Card>

          {/* 파트 3: 일하고 싶은 환경 */}
          <D23Card title={cfg.card_work_env}>
            <p className="text-xs text-slate-500">각 항목에 O(맞다) / X(아니다)를 선택하고, 이유를 간단히 적어보세요.</p>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">대행사 vs 인하우스</p>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs border-collapse border border-slate-100 rounded-xl overflow-hidden min-w-[360px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 w-20">유형</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200">특징</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600 border-b border-slate-200 w-16">O / X</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200">이유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfg.work_env_type_items.map((item, i) => (
                      <tr key={item.label} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-slate-700">{item.label}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-[11px] leading-snug">{item.desc}</td>
                        <td className="px-3 py-2.5">
                          <OXButtons value={data.work_env_type[i]?.choice ?? ''}
                            onChange={v => setWenv('work_env_type', i, 'choice', v)} />
                        </td>
                        <td className="px-3 py-2.5">
                          <TdInput value={data.work_env_type[i]?.reason ?? ''}
                            onChange={e => setWenv('work_env_type', i, 'reason', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">회사 규모</p>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs border-collapse border border-slate-100 rounded-xl overflow-hidden min-w-[360px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 w-20">규모</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200">특징</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600 border-b border-slate-200 w-16">O / X</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200">이유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfg.work_env_size_items.map((item, i) => (
                      <tr key={item.label} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-slate-700">{item.label}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-[11px] leading-snug">{item.desc}</td>
                        <td className="px-3 py-2.5">
                          <OXButtons value={data.work_env_size[i]?.choice ?? ''}
                            onChange={v => setWenv('work_env_size', i, 'choice', v)} />
                        </td>
                        <td className="px-3 py-2.5">
                          <TdInput value={data.work_env_size[i]?.reason ?? ''}
                            onChange={e => setWenv('work_env_size', i, 'reason', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </D23Card>

          {/* 파트 4: 목표 JD */}
          <D23Card title={cfg.card_target_jd}>
            <D23Field label={cfg.target_jd_url.label} hint={cfg.target_jd_url.hint}>
              <input value={data.target_jd_url} onChange={setStr('target_jd_url')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 mb-2"
                placeholder="https://..." />
              <D23Textarea value={data.target_jd_note} onChange={setStr('target_jd_note')} rows={4}
                placeholder={cfg.target_jd_note.placeholder} />
            </D23Field>
          </D23Card>

          {/* 파트 5: 취업 나침반 초안 */}
          <D23Card title={cfg.card_compass}>
            <D23Field label={cfg.compass_draft.label} hint={cfg.compass_draft.hint}>
              <D23Textarea value={data.compass_draft} onChange={setStr('compass_draft')} rows={5}
                placeholder={cfg.compass_draft.placeholder} />
            </D23Field>
          </D23Card>

        </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <button onClick={handleSave} disabled={isPending}
            className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {isPending ? '저장 중...' : '💾 저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DAY2+3 완료 슬랙 초안
// ══════════════════════════════════════════════════════════════════

function SlackScreen2({ studentName, topJob, onClose }: {
  studentName: string
  topJob: JobType | null
  onClose: () => void
}) {
  const jobName = topJob ? JOB_LABELS_FLAT[topJob] : '마케터'
  const [copied, setCopied] = useState(false)

  const draft = `OO튜터님 안녕하세요, ${studentName}입니다 :)

DAY 2+3 경험 정리를 완성했어요. 목표 직무와 취업 방향을 구체화해봤는데요,

피드백을 받고 싶습니다. [지금 / __시에] 잠깐 시간 괜찮으실까요? 10~15분 정도 부탁드려요 :)

* ${jobName} 방향으로 정리했어요`

  const handleCopy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900 mb-0.5">💬 슬랙 초안</h2>
        <p className="text-xs text-slate-400 mb-4">「OO」와 「[지금/__시에]」 부분을 수정한 후 복사하세요</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{draft}</pre>
        </div>

        <button onClick={handleCopy}
          className={`w-full font-semibold py-3 rounded-xl text-sm transition-all mb-2 ${
            copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}>
          {copied ? '✓ 복사됐어요!' : '📋 슬랙 초안 복사하기'}
        </button>

        <button onClick={onClose}
          className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          완료
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DAY 5 최종 정리 폼
// ══════════════════════════════════════════════════════════════════

const PRE_CHECKLIST_ITEMS = [
  '목표 직무를 1순위로 결정했다',
  '목표 JD를 1개 찾아 링크를 저장해뒀다',
  '내 경험 목록이 정리되어 있다 (캠프 전·후 모두)',
  '나의 강점 3가지를 경험 근거와 함께 쓸 수 있다',
  '나의 취업 나침반 한 장이 완성됐다',
]

function Day5FormScreen({ studentName, sessionRound, initialData, tutorComment, onComplete, onSave, onRollbackRequest }: {
  studentName: string
  sessionRound: number
  initialData: Day5Data
  tutorComment: string | null
  onComplete: () => void
  onSave?: (data: Day5Data) => Promise<{ error?: string } | null | undefined>
  onRollbackRequest?: () => void
}) {
  const [data, setData] = useState<Day5Data>(initialData)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const setField = (key: keyof Omit<Day5Data, 'pre_checklist'>) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setData(prev => ({ ...prev, [key]: e.target.value }))

  const toggleCheck = (item: string) =>
    setData(prev => ({
      ...prev,
      pre_checklist: {
        ...prev.pre_checklist,
        [item]: !prev.pre_checklist[item],
      },
    }))

  const handleSave = () => {
    startTransition(async () => {
      const result = await (onSave ? onSave(data) : saveDay5(sessionRound, data))
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10 shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-slate-500">{studentName}님</span>
          {onRollbackRequest ? (
            <button onClick={onRollbackRequest} className="text-xs text-slate-400 hover:text-amber-600 transition-colors">
              ↩ 수정하기
            </button>
          ) : <span />}
        </div>
      </nav>

      <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-white bg-purple-600 px-2 py-0.5 rounded-full">DAY 5</span>
          <h2 className="text-sm font-bold text-slate-900">나의 취업 나침반 완성</h2>
        </div>
        <p className="text-xs text-slate-400">DAY 1~3에서 쓴 내용을 바탕으로 한 장으로 압축해보세요. (약 1시간)</p>
      </div>

      {/* 튜터 코멘트 배너 */}
      {tutorComment && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 shrink-0">
          <p className="text-xs font-semibold text-emerald-700 mb-1">💬 튜터님 피드백</p>
          <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{tutorComment}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

          {/* 파트 1: 나의 취업 나침반 완성 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">파트 1 | 나의 취업 나침반 완성 <span className="text-xs font-normal text-slate-400">(40분)</span></p>
              <p className="text-xs text-slate-400 mt-0.5">DAY 1~3에서 쓴 내용을 아래에 옮겨 채워주세요</p>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <Label>🙋 나는 어떤 사람인가</Label>
                <Area value={data.compass_who} onChange={setField('compass_who')} rows={6}
                  placeholder={`핵심 경험 3가지 (캠프 전·후 통틀어):\n\n나의 강점 3가지 (근거 포함):\n\n에너지가 올라가는 일:\n\n피하고 싶은 일 + 이유:`} />
              </div>
              <div>
                <Label>🎯 나는 어디로 가는가</Label>
                <Area value={data.compass_where} onChange={setField('compass_where')} rows={6}
                  placeholder={`목표 직무 (1순위 / 2순위):\n\n대행사 vs 인하우스:\n\n선호 회사 규모:\n\n관심 산업:\n\n목표 JD 링크:`} />
              </div>
              <div>
                <Label>💬 나는 왜 이 방향인가</Label>
                <Hint>나는 (직무) 마케터로서 (환경)에서 일하고 싶다. 나의 (강점/경험)이 이 방향과 맞닿아 있기 때문이다.</Hint>
                <Area value={data.compass_why} onChange={setField('compass_why')} rows={4}
                  placeholder="나는 ___ 마케터로서 ___ 에서 일하고 싶다.&#10;나의 ___ 이 이 방향과 맞닿아 있기 때문이다." />
              </div>
            </div>
          </div>

          {/* 파트 2: 세션 전 체크리스트 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">파트 2 | 세션 전 체크리스트 <span className="text-xs font-normal text-slate-400">(20분)</span></p>
            </div>
            <div className="p-5 space-y-3">
              {PRE_CHECKLIST_ITEMS.map(item => (
                <label key={item} className="flex items-start gap-3 cursor-pointer group">
                  <div onClick={() => toggleCheck(item)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      data.pre_checklist[item]
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300 group-hover:border-slate-400'
                    }`}>
                    {data.pre_checklist[item] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm leading-relaxed ${
                    data.pre_checklist[item] ? 'text-emerald-700 line-through' : 'text-slate-700'
                  }`}>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 파트 3: 앞으로의 노력 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">파트 3 | 앞으로 어떤 노력을 할 건가</p>
              <p className="text-xs text-slate-400 mt-0.5">자유롭게 적어보세요. 순서나 우선순위를 매겨보고 튜터와 논의해봐요.</p>
            </div>
            <div className="p-5">
              <Area value={data.future_efforts} onChange={setField('future_efforts')} rows={7}
                placeholder="앞으로 해야 할 것들을 자유롭게 적어보세요..." />
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <button onClick={handleSave} disabled={isPending}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
            {isPending ? '저장 중...' : '🎉 완성! 저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 단계 롤백 모달
// ══════════════════════════════════════════════════════════════════

const ROLLBACK_OPTIONS: { target: RollbackTarget; label: string; desc: string; minStage: number }[] = [
  { target: 'day5',      label: 'DAY5 다시 작성',          desc: 'DAY5 최종 정리 내용이 삭제됩니다.',                                          minStage: 5 },
  { target: 'day23',     label: 'DAY2+3부터 다시',          desc: 'DAY2+3, DAY5 작성 내용이 삭제됩니다.',                         minStage: 3 },
  { target: 'day1',      label: 'DAY1부터 다시',            desc: 'DAY1 경험 정리, DAY2+3, DAY5 작성 내용이 삭제됩니다. 체크리스트 답변은 유지됩니다.', minStage: 1 },
  { target: 'checklist', label: '체크리스트부터 전부 다시', desc: '체크리스트를 포함한 모든 내용이 삭제됩니다.',                                minStage: 0 },
]

function RollbackModal({ currentStage, sessionRound, onClose }: {
  currentStage: number
  sessionRound: number
  onClose: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<RollbackTarget | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const available = ROLLBACK_OPTIONS.filter(o => currentStage >= o.minStage)

  const handleConfirm = () => {
    if (!selected || !confirmed) return
    startTransition(async () => {
      const result = await rollbackStage(sessionRound, selected)
      if (result.success) {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-base font-bold text-slate-900 mb-1">어느 단계로 돌아갈까요?</h3>
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-amber-700">
            ⚠️ 선택한 단계부터 저장된 내용이 모두 삭제됩니다. 복구할 수 없으니 신중하게 선택하세요.
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {available.map(opt => (
            <button key={opt.target}
              onClick={() => { setSelected(opt.target); setConfirmed(false) }}
              className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                selected === opt.target
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
              <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
            </button>
          ))}
        </div>

        {selected && (
          <label className="flex items-start gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-red-500 shrink-0" />
            <span className="text-xs text-slate-600 leading-relaxed">
              선택한 단계의 저장된 내용이 삭제된다는 것을 확인했습니다.
            </span>
          </label>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button onClick={handleConfirm}
            disabled={!selected || !confirmed || isPending}
            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-red-600 transition-colors">
            {isPending ? '처리 중...' : '돌아가기'}
          </button>
        </div>
      </div>
    </div>
  )
}
