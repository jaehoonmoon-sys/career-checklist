'use client'

import { Fragment, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { JOB_LABELS_FLAT, type JobType } from '@/lib/survey-questions'
import { saveDay1, saveNextSteps } from '@/app/actions/checklist'
import { type Day1Data, EMPTY_DAY1, NEXT_STEPS_ITEMS } from '@/lib/types'
import { type FormConfig, DEFAULT_FORM_CONFIG, FIXED_DAY1_IDS } from '@/lib/form-config'

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}

type Props = {
  studentName: string
  topJob: JobType | null
  topJobPct: number
  sessionRound: number
  initialDay1: Day1Data
  preSelectedJob: JobType | null
  formConfig?: FormConfig
  onClose: () => void
}

export default function PostSaveFlow(props: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'choice' | 'day1'>('choice')

  if (step === 'choice') {
    return (
      <ChoiceScreen
        topJob={props.topJob}
        topJobPct={props.topJobPct}
        preSelectedJob={props.preSelectedJob}
        onDay1={() => setStep('day1')}
        onClose={props.onClose}
      />
    )
  }

  return (
    <Day1FormScreen
      topJob={props.topJob}
      sessionRound={props.sessionRound}
      initialDay1={props.initialDay1}
      formConfig={props.formConfig}
      onComplete={() => { router.refresh(); props.onClose() }}
      onClose={props.onClose}
    />
  )
}

// ── 선택지 화면 ──────────────────────────────────────────────────

function ChoiceScreen({ topJob, topJobPct, preSelectedJob, onDay1, onClose }: {
  topJob: JobType | null
  topJobPct: number
  preSelectedJob: JobType | null
  onDay1: () => void
  onClose: () => void
}) {
  const color = topJob ? JOB_COLORS[topJob] : '#64748b'
  const isSame = preSelectedJob && topJob && preSelectedJob === topJob
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          ✕
        </button>

        <div className="text-center mb-4">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">체크리스트 저장 완료!</h2>
          {topJob && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: `${color}14` }}>
              <span className="font-bold" style={{ color }}>{JOB_LABELS_FLAT[topJob]}</span>
              <span className="text-sm font-medium" style={{ color }}>{topJobPct}% 적합도</span>
            </div>
          )}
        </div>

        {/* 사전 선택 vs 결과 비교 */}
        {preSelectedJob && topJob && (
          <div className="bg-slate-50 rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">처음 생각한 직무</p>
                <p className="text-sm font-semibold text-slate-600">{JOB_LABELS_FLAT[preSelectedJob]}</p>
              </div>
              <div className="text-slate-300 text-base shrink-0">→</div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">체크리스트 결과</p>
                <p className="text-sm font-bold" style={{ color }}>{JOB_LABELS_FLAT[topJob]}</p>
              </div>
            </div>
            <p className="text-center text-[11px] mt-2 font-medium"
              style={{ color: isSame ? '#10b981' : '#6366f1' }}>
              {isSame ? '예상과 결과가 일치했어요! ✓' : '새로운 발견이 있었나요? 🔍'}
            </p>
          </div>
        )}

        <button onClick={onDay1}
          className="w-full bg-slate-900 text-white rounded-2xl p-4 text-left hover:bg-slate-800 transition-colors active:scale-[0.98]">
          <div className="font-semibold text-base mb-0.5">📝 나의 경험 정리하러 가기</div>
          <div className="text-xs text-slate-400">DAY 1 경험 정리 작성하기</div>
        </button>
      </div>
    </div>
  )
}

// ── DAY 1 폼 (섹션 기반 렌더링) ──────────────────────────────────

export function Day1FormScreen({ topJob, sessionRound, initialDay1, formConfig, onComplete, onClose }: {
  topJob: JobType | null
  sessionRound: number
  initialDay1: Day1Data
  formConfig?: FormConfig
  onComplete: () => void
  onClose: () => void
}) {
  const cfg = formConfig?.day1 ?? DEFAULT_FORM_CONFIG.day1
  const [data, setData] = useState<Day1Data>({ ...EMPTY_DAY1, ...initialDay1 })
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')
  const [showNextSteps, setShowNextSteps] = useState(false)

  const setFixed = (key: string) =>
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setData(prev => ({ ...prev, [key]: e.target.value }))

  const setExtra = (id: string) =>
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setData(prev => ({
        ...prev,
        extra_fields: { ...(prev.extra_fields ?? {}), [id]: e.target.value },
      }))

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDay1(sessionRound, data)
      if (result?.error) setSaveMsg(result.error)
      else setShowNextSteps(true)
    })
  }

  if (showNextSteps) {
    return (
      <NextStepsScreen
        initialNextSteps={data.next_steps}
        sessionRound={sessionRound}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded-full">DAY 1</span>
          <h2 className="text-sm font-bold text-slate-900">나의 경험 꺼내기</h2>
        </div>
        <button onClick={onClose}
          className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          ✕
        </button>
      </div>

      {/* 폼 내용 + 사이드바 */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

            {/* 시작 전 읽기 */}
            <D1Callout color="blue" icon="💡">
              <p className="font-semibold mb-1.5">여기서부터가 진짜 취업 준비예요 <span className="font-normal text-xs">— 시작 전 읽기 (5분)</span></p>
              {topJob && (
                <p className="leading-relaxed mb-1">
                  결과로 <strong>{JOB_LABELS_FLAT[topJob]}</strong>가 나왔지만, 이건 단순 참고예요.
                </p>
              )}
              <p className="leading-relaxed whitespace-pre-line">{cfg.intro_callout}</p>
            </D1Callout>

            {/* 섹션 반복 */}
            {cfg.sections.map(section => (
              <Fragment key={section.id}>
                <D1SectionHeader title={section.title} time={section.time} />

                {section.fields.map(field => {
                  if (field.type === 'subtitle') {
                    return (
                      <p key={field.id} className="text-xs font-semibold text-slate-500 -mt-4">
                        {field.label}
                      </p>
                    )
                  }

                  const isFixed = FIXED_DAY1_IDS.has(field.id)
                  const val = isFixed
                    ? ((data[field.id as keyof Day1Data] as string) ?? '')
                    : (data.extra_fields?.[field.id] ?? '')
                  const handleChange = isFixed ? setFixed(field.id) : setExtra(field.id)

                  return (
                    <D1Field key={field.id} label={field.label} desc={field.desc} example={field.example}>
                      {field.callout && (
                        <D1Callout color="yellow" icon="💬">
                          <span className="whitespace-pre-line">{field.callout}</span>
                        </D1Callout>
                      )}
                      {field.type === 'input' ? (
                        <input
                          value={val}
                          onChange={handleChange}
                          placeholder={field.placeholder ?? '여기에 작성하세요'}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-colors"
                        />
                      ) : (
                        <D1Textarea value={val} onChange={handleChange} placeholder={field.placeholder} />
                      )}
                    </D1Field>
                  )
                })}
              </Fragment>
            ))}

          </div>
        </div>

        <aside className="hidden lg:flex flex-col w-64 shrink-0 p-4 overflow-y-auto border-l border-slate-100 bg-slate-50">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">✅ 다음 단계 진행 현황</p>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              경험 정리가 끝났으면 아래 항목들을 틈틈이 해보세요. 완료하면 체크!
            </p>
            <NextStepsChecklist initialNextSteps={data.next_steps ?? {}} sessionRound={sessionRound} />
          </div>
        </aside>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <button onClick={handleSave} disabled={isPending}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
            {isPending ? '저장 중...' : '💾 저장 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DAY1 폼 UI 헬퍼 ──────────────────────────────────────────────

function D1SectionHeader({ title, time }: { title: string; time?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-200" />
      <p className="text-xs font-bold text-slate-500 whitespace-nowrap">
        {title}{time && <span className="font-normal text-slate-400"> · {time}</span>}
      </p>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function D1Field({ label, desc, example, children }: {
  label: string
  desc?: string
  example?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {desc && <p className="text-xs text-slate-500">{desc}</p>}
      {example && (
        <D1Callout color="amber" icon="📎">
          <strong>예시</strong>: {example}
        </D1Callout>
      )}
      {children}
    </div>
  )
}

function D1Callout({ color, icon, children }: {
  color: 'blue' | 'amber' | 'yellow'
  icon: string
  children: React.ReactNode
}) {
  const cls = {
    blue:   'bg-blue-50 border border-blue-100 text-blue-800',
    amber:  'bg-amber-50 border border-amber-100 text-amber-800',
    yellow: 'bg-yellow-50 border border-yellow-100 text-yellow-800',
  }[color]
  return (
    <div className={`${cls} rounded-xl px-3 py-2.5 text-xs leading-relaxed`}>
      <span className="mr-1">{icon}</span>{children}
    </div>
  )
}

function D1Textarea({ value, onChange, placeholder }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={4}
      placeholder={placeholder ?? '여기에 작성하세요'}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-colors"
      style={{ resize: 'none', overflow: 'hidden', minHeight: '6rem' }}
    />
  )
}

// ── 저장 후 다음 단계 안내 화면 ──────────────────────────────────

function NextStepsScreen({ initialNextSteps, sessionRound, onComplete }: {
  initialNextSteps: Record<string, boolean>
  sessionRound: number
  onComplete: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">경험 정리 완료!</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              이제 틈틈이 아래 내용들을 해보세요.<br />
              완료한 항목에 직접 체크하면서 취업 준비를 이어가세요.
            </p>
          </div>
          <NextStepsChecklist initialNextSteps={initialNextSteps} sessionRound={sessionRound} />
        </div>
      </div>
      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-lg mx-auto">
          <button onClick={onComplete}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm">
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 다음 단계 체크리스트 (export — 사이드바에서도 사용) ──────────

export function NextStepsChecklist({ initialNextSteps, sessionRound }: {
  initialNextSteps: Record<string, boolean>
  sessionRound: number
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(initialNextSteps)
  const [, startTransition] = useTransition()

  const toggle = (item: string) => {
    const updated = { ...checks, [item]: !checks[item] }
    setChecks(updated)
    startTransition(async () => { await saveNextSteps(sessionRound, updated) })
  }

  const doneCount = NEXT_STEPS_ITEMS.filter(item => checks[item]).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">진행 현황</p>
        <p className="text-xs font-semibold text-slate-600">{doneCount} / {NEXT_STEPS_ITEMS.length}</p>
      </div>
      <div className="space-y-3">
        {NEXT_STEPS_ITEMS.map(item => (
          <label key={item} className="flex items-start gap-3 cursor-pointer group">
            <button type="button" onClick={() => toggle(item)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                checks[item] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-slate-400'
              }`}>
              {checks[item] && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`text-sm leading-relaxed ${checks[item] ? 'text-emerald-600 line-through' : 'text-slate-700'}`}>
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
