'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import {
  QUESTIONS, CATEGORIES, ANSWER_OPTIONS, ANSWER_WEIGHTS, JOB_LABELS, JOB_LABELS_FLAT,
  calcJobScores, calcMaxScores, type JobType,
} from '@/lib/survey-questions'
import { saveCompetencyAnswers } from '@/app/actions/checklist'
import PostSaveFlow from './PostSaveFlow'
import { type ExperienceData } from '@/lib/types'

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

// 선택지별 색상
const OPTION_COLORS: Record<number, string> = {
  0: '#94a3b8',  // 어렵다
  1: '#3b82f6',  // 관심있다
  2: '#10b981',  // 잘한다
  3: '#8b5cf6',  // 재미있다
  4: '#f97316',  // 경험있다
}

// 카테고리별 JD 키워드 (학습 힌트용)
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
  initialAnswers: Record<string, number>
  initialExperiences: ExperienceData
  sessionRound: number
  studentName: string
}

export default function CompetencyChecklist({ initialAnswers, initialExperiences, sessionRound, studentName }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)
  const [saved, setSaved] = useState(Object.keys(initialAnswers).length > 0)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [showFlow, setShowFlow] = useState(false)

  const answeredCount = Object.keys(answers).length
  const positiveCount = Object.entries(answers).filter(([, v]) => ANSWER_WEIGHTS[v] > 0).length

  const jobScores = useMemo(() => calcJobScores(answers), [answers])

  const radarData = JOB_ORDER.map((job) => {
    const raw = Math.max(0, (jobScores[job] / MAX_SCORES[job]) * 100)
    return { subject: JOB_LABELS[job], value: toDisplayValue(raw), fullMark: 100 }
  })

  const jobPercents = useMemo(() =>
    JOB_ORDER.reduce((acc, job) => ({
      ...acc,
      [job]: Math.max(0, Math.round((jobScores[job] / MAX_SCORES[job]) * 100)),
    }), {} as Record<JobType, number>),
  [jobScores])

  const topJob = JOB_ORDER.reduce((a, b) => jobScores[a] >= jobScores[b] ? a : b)
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
      const result = await saveCompetencyAnswers(sessionRound, answers)
      if (result?.error) { setSaveMsg(result.error) }
      else { setSaved(true); setSaveMsg('저장됐어요!'); setTimeout(() => setSaveMsg(''), 2000); setShowFlow(true) }
    })
  }

  const handleReset = () => {
    setAnswers({})
    setSaved(false)
    setSaveMsg('')
    setResetConfirm(false)
  }

  // 오른쪽 패널 (레이더 + 직무 바) — 데스크톱·모바일 공용
  const rightPanel = (
    <div className="space-y-3">
      {/* 레이더 차트 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-600 mb-1">📊 직무 적합도 레이더</p>
        <ResponsiveContainer width="100%" height={230}>
          <RadarChart data={radarData} margin={{ top: 14, right: 32, bottom: 14, left: 32 }}>
            <PolarGrid gridType="polygon" stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={(props) => <CustomTick {...props} />} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={chartColor} fill={chartColor}
              fillOpacity={0.35} dot={{ r: 3, fill: chartColor }}
              animationDuration={250} animationBegin={0} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 카운터 + 가장 잘 맞는 직무 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs text-slate-400 mb-2">
          <span className="text-slate-700 font-semibold text-sm">{answeredCount}</span>
          {' '}/ {TOTAL_QUESTIONS}개 항목 선택됨
        </p>
        <div className="rounded-xl p-4 text-center transition-all duration-300"
          style={{ backgroundColor: `${chartColor}14` }}>
          <p className="text-[11px] text-slate-400 mb-1">🔥 가장 잘 맞는 직무</p>
          {positiveCount > 0 ? (
            <>
              <p className="text-lg font-bold leading-tight" style={{ color: chartColor }}>
                {JOB_LABELS_FLAT[topJob]}
              </p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: chartColor }}>
                적합도 {jobPercents[topJob]}%
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-slate-300">항목을 선택해주세요</p>
              <p className="text-[11px] text-slate-300 mt-0.5">체크할수록 결과가 정확해집니다</p>
            </>
          )}
        </div>
      </div>

      {/* 직무별 적합도 바 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">직무별 적합도</p>
        {JOB_ORDER.map(job => {
          const pct = jobPercents[job]
          return (
            <div key={job} className="mb-2.5 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: JOB_COLORS[job] }}>
                  {JOB_LABELS_FLAT[job]}
                </span>
                <span className="text-xs text-slate-400">{pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: JOB_COLORS[job] }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 초기화 버튼 */}
      {resetConfirm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex items-center gap-2">
          <p className="text-xs text-slate-400 shrink-0">정말 초기화할까요?</p>
          <button onClick={() => setResetConfirm(false)}
            className="flex-1 border border-slate-200 text-slate-500 text-xs py-2 rounded-lg">
            취소
          </button>
          <button onClick={handleReset}
            className="flex-1 bg-red-500 text-white text-xs py-2 rounded-lg">
            초기화
          </button>
        </div>
      ) : (
        <button onClick={() => setResetConfirm(true)} disabled={answeredCount === 0}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 py-2.5 text-sm text-slate-400 disabled:opacity-40 hover:border-slate-200 transition-colors">
          ↺ 초기화
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 네비 */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← 메인</a>
          <span className="text-xs text-slate-400">{studentName}님 · {sessionRound}차 면담 준비</span>
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
      <section className="bg-white border-b border-slate-100 py-7 px-4 text-center">
        <span className="inline-block bg-slate-100 text-slate-500 text-[11px] font-medium px-3 py-1 rounded-full mb-3">
          디지털 마케터 부트캠프
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mb-1.5">나는 어떤 마케터일까? 🎯</h1>
        <p className="text-sm text-slate-500 mb-0.5">경험이 없어도 괜찮습니다. 관심·성향·재미를 기준으로 솔직하게 체크해주세요.</p>
        <p className="text-sm text-slate-500 mb-5">체크할수록 나의 직무 적합도가 레이더 차트로 나타납니다.</p>
        {/* 선택지 범례 — 긍정 옵션만 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {ANSWER_OPTIONS.filter(o => o.key > 0).map(opt => (
            <div key={opt.key}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border"
              style={{
                borderColor: `${OPTION_COLORS[opt.key]}50`,
                backgroundColor: `${OPTION_COLORS[opt.key]}0d`,
              }}>
              <span className="text-xs font-bold" style={{ color: OPTION_COLORS[opt.key] }}>{opt.label}</span>
              <span className="text-xs text-slate-500">{opt.desc}</span>
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
          {CATEGORIES.map(cat => {
            const catQs = QUESTIONS.filter(q => q.category === cat.key)
            if (!catQs.length) return null
            const catDone = catQs.filter(q => answers[q.id] !== undefined).length

            return (
              <div key={cat.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* 카테고리 헤더 */}
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline ml-1">
                    JD 키워드: {CAT_KEYWORDS[cat.key]}
                  </span>
                  <span className="ml-auto text-xs text-slate-400 font-medium">{catDone}/{catQs.length}</span>
                </div>

                {/* 질문 목록 */}
                <div className="divide-y divide-slate-50">
                  {catQs.map(q => {
                    const sel = answers[q.id]
                    const isAnswered = sel !== undefined
                    const optColor = isAnswered ? OPTION_COLORS[sel] : null

                    return (
                      <div key={q.id} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          {/* 체크박스 */}
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
                            {/* 선택된 옵션 뱃지 */}
                            {isAnswered && (
                              <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full text-white mb-0.5"
                                style={{ backgroundColor: optColor! }}>
                                {ANSWER_OPTIONS.find(o => o.key === sel)?.label}
                              </span>
                            )}
                            {/* 질문 텍스트 */}
                            <p className="text-[14px] font-semibold text-slate-800 leading-snug">{q.text}</p>
                          </div>
                        </div>

                        {/* 선택 버튼 */}
                        <div className="flex gap-1 mt-2 ml-[30px]">
                          {ANSWER_OPTIONS.map(opt => {
                            const isSelected = sel === opt.key
                            return (
                              <button key={opt.key} onClick={() => selectOption(q.id, opt.key)}
                                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                                  isSelected
                                    ? 'text-white border-transparent shadow-sm'
                                    : opt.key === 0
                                      ? 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
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
        <div className="hidden lg:block w-[320px] shrink-0 sticky top-14"
          style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
          {rightPanel}
        </div>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-100 p-3 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3 lg:justify-end">
          {saveMsg && (
            <p className="text-sm text-emerald-600 font-medium">{saveMsg}</p>
          )}
          <button onClick={handleSave} disabled={isPending || answeredCount === 0}
            className="w-full lg:w-auto lg:min-w-[180px] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all"
            style={answeredCount > 0 ? { backgroundColor: chartColor } : {}}>
            {isPending ? '저장 중...'
              : saved ? `✓ 저장됨 (${answeredCount}개)`
              : `${answeredCount}개 항목 저장하기`}
          </button>
        </div>
      </div>

      {/* 저장 후 다음 단계 플로우 */}
      {showFlow && (
        <PostSaveFlow
          studentName={studentName}
          topJob={topJob}
          jobPct={jobPercents[topJob]}
          sessionRound={sessionRound}
          initialExperiences={initialExperiences}
          onClose={() => setShowFlow(false)}
        />
      )}
    </div>
  )
}
