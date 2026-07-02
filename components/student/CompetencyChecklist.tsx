'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import {
  QUESTIONS, CATEGORIES, ANSWER_OPTIONS, ANSWER_WEIGHTS, JOB_LABELS, JOB_LABELS_FLAT,
  JOB_EMOJIS, JOB_SHORT_LABELS,
  calcJobScores, calcMaxScores, type JobType,
} from '@/lib/survey-questions'
import { saveCompetencyAnswers } from '@/app/actions/checklist'
import PostSaveFlow from './PostSaveFlow'
import { type Day1Data } from '@/lib/types'
import { type FormConfig } from '@/lib/form-config'

const MAX_SCORES = calcMaxScores()
const JOB_ORDER: JobType[] = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']
const TOTAL_QUESTIONS = QUESTIONS.length

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6',
  content: '#8b5cf6',
  brand: '#ec4899',
  growth: '#10b981',
  crm: '#f97316',
  ae: '#6366f1',
}

const OPTION_COLORS: Record<number, string> = {
  0: '#f87171', // 어렵다 (red)
  1: '#94a3b8', // 잘모르겠다 (neutral grey)
  2: '#3b82f6', // 관심있다 (blue)
  3: '#8b5cf6', // 좋아한다 (purple)
  4: '#f97316', // 경험있다 (orange)
}

const CAT_KEYWORDS: Record<string, string> = {
  data:     'CTR, ROAS, CPA, GA4, A/B테스트',
  writing:  '카피라이팅, 콘텐츠 기획, 숏폼, SNS',
  ads:      '광고 매체 운영, 소재 제작, 채널 관리',
  strategy: '브랜드 전략, 포지셔닝, 캠페인 기획',
  growth:   '전환율, 리텐션, 퍼널 분석',
  people:   '고객 세분화, CRM, 고객 여정',
  collab:   '프로젝트 관리, 발표, 협업',
  tools:    'AI 툴, 디자인 툴, 분석 도구',
}

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
  initialAnswers: Record<string, number>
  initialDay1: Day1Data
  sessionRound: number
  studentName: string
  formConfig?: FormConfig
  onAfterSave?: () => void  // 제공 시 저장 후 PostSaveFlow 대신 호출
}

export default function CompetencyChecklist({ initialAnswers, initialDay1, sessionRound, studentName, formConfig, onAfterSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)
  const [saved, setSaved] = useState(
    Object.keys(initialAnswers).filter(k => !k.startsWith('_')).length > 0
  )
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [showFlow, setShowFlow] = useState(false)

  // 사전 직무 선택 (체크리스트 전 직감 선택)
  const [preSelectedJob, setPreSelectedJob] = useState<JobType | null>(() => {
    const idx = initialAnswers['_pre']
    return typeof idx === 'number' && idx >= 0 && idx < JOB_ORDER.length
      ? JOB_ORDER[idx]
      : null
  })

  // _pre 키 제외한 실제 답변 수
  const answeredCount = useMemo(() =>
    Object.keys(answers).filter(k => !k.startsWith('_')).length,
  [answers])

  const positiveCount = useMemo(() =>
    Object.entries(answers).filter(([k, v]) => !k.startsWith('_') && ANSWER_WEIGHTS[v] > 0).length,
  [answers])

  const jobScores = useMemo(() => calcJobScores(answers), [answers])

  // 모든 표시는 jobPercents 기준 (레이더·바·선택직무 일치)
  const jobPercents = useMemo(() =>
    JOB_ORDER.reduce((acc, job) => ({
      ...acc,
      [job]: Math.max(0, Math.round((jobScores[job] / MAX_SCORES[job]) * 100)),
    }), {} as Record<JobType, number>),
  [jobScores])

  const radarData = useMemo(() =>
    JOB_ORDER.map((job) => ({
      subject: JOB_LABELS[job],
      value: jobPercents[job],
      fullMark: 100,
    })),
  [jobPercents])

  const topJob = useMemo(() =>
    JOB_ORDER.reduce((a, b) =>
      Math.max(0, jobScores[a] / MAX_SCORES[a]) >= Math.max(0, jobScores[b] / MAX_SCORES[b]) ? a : b
    ),
  [jobScores])

  const chartColor = positiveCount > 0 ? JOB_COLORS[topJob] : '#94a3b8'

  const selectOption = (qId: string, optKey: number) => {
    setSaved(false)
    setResetConfirm(false)
    setAnswers((prev) => {
      if (prev[qId] === optKey) {
        const next = { ...prev }
        delete next[qId]
        return next
      }
      return { ...prev, [qId]: optKey }
    })
  }

  const handleSave = () => {
    setResetConfirm(false)
    startTransition(async () => {
      // 일반 답변만 추출 후 _pre 추가
      const answersToSave: Record<string, number> = {}
      for (const [k, v] of Object.entries(answers)) {
        if (!k.startsWith('_')) answersToSave[k] = v
      }
      if (preSelectedJob !== null) {
        answersToSave['_pre'] = JOB_ORDER.indexOf(preSelectedJob)
      }
      const result = await saveCompetencyAnswers(sessionRound, answersToSave)
      if (result?.error) { setSaveMsg(result.error) }
      else {
        setSaved(true); setSaveMsg('저장됐어요!'); setTimeout(() => setSaveMsg(''), 2000)
        if (onAfterSave) onAfterSave()
        else setShowFlow(true)
      }
    })
  }

  const handleReset = () => {
    setAnswers({})
    setSaved(false)
    setSaveMsg('')
    setResetConfirm(false)
  }

  const rightPanel = (
    <div className="space-y-2">
      {/* 레이더 차트 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
        <p className="text-xs font-semibold text-slate-600 mb-0.5">📊 직무 적합도 레이더</p>
        <ResponsiveContainer width="100%" height={190}>
          <RadarChart data={radarData} margin={{ top: 14, right: 30, bottom: 14, left: 30 }}>
            <PolarGrid gridType="polygon" stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={(props) => <CustomTick {...props} />} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={chartColor} fill={chartColor}
              fillOpacity={0.35} dot={{ r: 3, fill: chartColor }}
              animationDuration={600} animationBegin={0} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 선택된 직무 + 직무별 바 통합 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
        <p className="text-xs text-slate-400 mb-1.5">
          <span className="text-slate-700 font-semibold text-sm">{answeredCount}</span>
          {' '}/ {TOTAL_QUESTIONS}개 선택됨
        </p>

        {positiveCount > 0 ? (
          <div className="rounded-xl p-3 text-center mb-3 transition-all duration-300"
            style={{ backgroundColor: `${chartColor}14` }}>
            <p className="text-[10px] text-slate-400 mb-0.5">🔥 가장 잘 맞는 직무</p>
            <p className="text-base font-bold leading-tight" style={{ color: chartColor }}>
              {JOB_LABELS_FLAT[topJob]}
            </p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: chartColor }}>
              적합도 {jobPercents[topJob]}%
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-3 text-center mb-3 bg-slate-50">
            <p className="text-sm font-bold text-slate-300">항목을 선택해주세요</p>
            <p className="text-[11px] text-slate-300 mt-0.5">체크할수록 결과가 정확해집니다</p>
          </div>
        )}

        {/* 직무별 바 */}
        <div className="space-y-2">
          {JOB_ORDER.map(job => {
            const pct = jobPercents[job]
            return (
              <div key={job}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium" style={{ color: JOB_COLORS[job] }}>
                    {JOB_SHORT_LABELS[job]}
                  </span>
                  <span className="text-[11px] text-slate-400">{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: JOB_COLORS[job] }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 네비 */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← 메인</a>
          <span className="text-xs text-slate-400">{studentName}님</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`, backgroundColor: chartColor }} />
            </div>
            <span className="text-xs text-slate-500 font-medium">{answeredCount}/{TOTAL_QUESTIONS}</span>
          </div>
        </div>
      </nav>

      {/* 타이틀 섹션 */}
      <section className="bg-white border-b border-slate-100 py-6 px-4 text-center">
        <span className="inline-block bg-slate-100 text-slate-500 text-[11px] font-medium px-3 py-1 rounded-full mb-3">
          디지털 마케터 부트캠프
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mb-1.5">나는 어떤 마케터일까? 🎯</h1>
        <p className="text-sm text-slate-500 mb-3">관심·성향·재미를 기준으로 솔직하게 체크하면, 직무 적합도가 레이더 차트로 나타납니다.</p>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4 text-left">
          <p className="text-xs font-semibold text-amber-700 mb-1">✅ 이 체크리스트는 가볍게 참고하는 용도예요</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            정답도, 정해진 직무도 없습니다. 결과에 너무 의미를 두지 않아도 돼요.<br />
            체크리스트가 끝나면 <strong>나의 경험을 직접 정리하면서 취업 준비</strong>를 시작하게 됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {ANSWER_OPTIONS.map(opt => (
            <div key={opt.key}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 border"
              style={{
                borderColor: `${OPTION_COLORS[opt.key]}50`,
                backgroundColor: `${OPTION_COLORS[opt.key]}0d`,
              }}>
              <span className="text-[11px] font-bold" style={{ color: OPTION_COLORS[opt.key] }}>{opt.label}</span>
              <span className="text-[11px] text-slate-500">{opt.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 모바일: 오른쪽 패널 상단 배치 */}
      <div className="lg:hidden max-w-2xl mx-auto px-4 pt-4">{rightPanel}</div>

      {/* 메인 레이아웃 */}
      <div className="max-w-6xl mx-auto px-4 py-5 pb-24 lg:flex lg:gap-5 lg:items-start">

        {/* 왼쪽: 질문 목록 */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 첫 번째 카드: 직감으로 직무 미리 선택 */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
              <span className="text-base">💡</span>
              <span className="text-sm font-semibold text-slate-800">먼저, 직감으로 선택해보세요</span>
              <span className="text-[11px] text-indigo-400 ml-auto">필수 아님</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-slate-500 mb-3">
                체크리스트를 시작하기 전에, 지금 직감으로 <strong className="text-slate-700">내가 가장 잘 맞는다고 생각하는 직무</strong>를
                하나 골라보세요. 결과와 비교해볼 거예요.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {JOB_ORDER.map(job => {
                  const isSelected = preSelectedJob === job
                  return (
                    <button key={job}
                      onClick={() => setPreSelectedJob(isSelected ? null : job)}
                      className={`py-2 px-2 rounded-xl text-[12px] font-semibold border-2 transition-all ${
                        isSelected
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                      style={isSelected ? { backgroundColor: JOB_COLORS[job], borderColor: JOB_COLORS[job] } : {}}>
                      {JOB_EMOJIS[job]} {JOB_SHORT_LABELS[job]}
                    </button>
                  )
                })}
              </div>
              {preSelectedJob && (
                <p className="text-[11px] text-slate-400 mt-2.5">
                  선택됨:{' '}
                  <span className="font-semibold" style={{ color: JOB_COLORS[preSelectedJob] }}>
                    {JOB_LABELS_FLAT[preSelectedJob]}
                  </span>
                  {' — 체크리스트 결과와 비교해볼게요!'}
                </p>
              )}
            </div>
          </div>

          {/* 카테고리별 질문 */}
          {CATEGORIES.map(cat => {
            const catQs = QUESTIONS.filter(q => q.category === cat.key)
            if (!catQs.length) return null
            const catDone = catQs.filter(q => answers[q.id] !== undefined).length

            return (
              <div key={cat.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline ml-1">
                    JD 키워드: {CAT_KEYWORDS[cat.key]}
                  </span>
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
                          <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            !isAnswered ? 'border-slate-200 bg-white' : ''
                          }`} style={isAnswered ? {
                            backgroundColor: optColor!,
                            borderColor: optColor!,
                          } : {}}>
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
                              <button key={opt.key} onClick={() => selectOption(q.id, opt.key)}
                                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                                  isSelected
                                    ? 'text-white border-transparent shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                                style={isSelected ? {
                                  backgroundColor: OPTION_COLORS[opt.key],
                                  borderColor: OPTION_COLORS[opt.key],
                                } : {}}>
                                {opt.label}
                              </button>
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

        {/* 오른쪽 패널 — 데스크톱 sticky */}
        <div className="hidden lg:block w-[300px] shrink-0 sticky top-[3.25rem]"
          style={{ maxHeight: 'calc(100vh - 3.25rem)', overflowY: 'auto' }}>
          {rightPanel}
        </div>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-100 p-3 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          {answeredCount > 0 && (
            resetConfirm ? (
              <>
                <button onClick={() => setResetConfirm(false)}
                  className="shrink-0 border border-slate-200 text-slate-500 text-xs py-2 px-3 rounded-lg whitespace-nowrap">
                  취소
                </button>
                <button onClick={handleReset}
                  className="shrink-0 bg-red-500 text-white text-xs py-2 px-3 rounded-lg font-medium whitespace-nowrap">
                  초기화
                </button>
              </>
            ) : (
              <button onClick={() => setResetConfirm(true)}
                className="shrink-0 text-sm text-slate-400 hover:text-slate-600 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
                ↺ 초기화
              </button>
            )
          )}
          {saveMsg && (
            <p className="flex-1 text-sm text-emerald-600 font-medium text-right">{saveMsg}</p>
          )}
          <button onClick={handleSave} disabled={isPending || answeredCount === 0}
            className="flex-1 lg:flex-none lg:min-w-[180px] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all"
            style={answeredCount > 0 ? { backgroundColor: chartColor } : {}}>
            {isPending ? '저장 중...'
              : saved ? `✓ 저장됨 (${answeredCount}개)`
              : `${answeredCount}개 항목 저장하기`}
          </button>
        </div>
      </div>

      {showFlow && (
        <PostSaveFlow
          studentName={studentName}
          topJob={topJob}
          topJobPct={jobPercents[topJob]}
          sessionRound={sessionRound}
          initialDay1={initialDay1}
          preSelectedJob={preSelectedJob}
          formConfig={formConfig}
          onClose={() => setShowFlow(false)}
        />
      )}
    </div>
  )
}
