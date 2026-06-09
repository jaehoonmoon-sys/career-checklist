'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import {
  QUESTIONS, CATEGORIES, ANSWER_OPTIONS, JOB_LABELS,
  calcJobScores, calcMaxScores, type JobType,
} from '@/lib/survey-questions'
import { saveCompetencyAnswers } from '@/app/actions/checklist'

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

const toDisplayValue = (rawPercent: number) =>
  rawPercent === 0 ? 0 : Math.round(Math.pow(rawPercent / 100, 0.55) * 100)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTick = ({ x, y, payload }: any) => {
  const lines = (payload.value as string).split('\n')
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line: string, i: number) => (
        <text key={i} x={0} y={0} dy={i * 13 - (lines.length - 1) * 6.5}
          textAnchor="middle" fill="#64748b" fontSize={11}>
          {line}
        </text>
      ))}
    </g>
  )
}

type Props = {
  initialAnswers: Record<string, number>
  sessionRound: number
  studentName: string
}

export default function CompetencyChecklist({ initialAnswers, sessionRound, studentName }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)
  const [saved, setSaved] = useState(Object.keys(initialAnswers).length > 0)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)

  const answeredCount = Object.keys(answers).length
  const positiveCount = Object.values(answers).filter(v => v > 0).length

  const jobScores = useMemo(() => calcJobScores(answers), [answers])

  const radarData = JOB_ORDER.map((job) => {
    const rawPercent = (jobScores[job] / MAX_SCORES[job]) * 100
    return { subject: JOB_LABELS[job], value: toDisplayValue(rawPercent), fullMark: 100 }
  })

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
      else { setSaved(true); setSaveMsg('저장됐어요!'); setTimeout(() => setSaveMsg(''), 2000) }
    })
  }

  const handleReset = () => {
    setAnswers({})
    setSaved(false)
    setSaveMsg('')
    setResetConfirm(false)
  }

  const chartCard = (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs text-slate-400 text-center mb-1">직무 지향점</p>
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid gridType="polygon" stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={(props) => <CustomTick {...props} />} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke={chartColor} fill={chartColor}
            fillOpacity={0.4} dot={{ r: 5, fill: chartColor }}
            animationDuration={250} animationBegin={0} />
        </RadarChart>
      </ResponsiveContainer>
      {positiveCount > 0 ? (
        <p className="text-center text-sm font-semibold mt-2" style={{ color: chartColor }}>
          ✨ {JOB_LABELS[topJob].replace('\n', ' ')} 지향
        </p>
      ) : (
        <p className="text-center text-xs text-slate-400 mt-2">항목을 선택하면 결과가 나타나요</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-slate-400 hover:text-slate-600 transition-colors text-sm">← 메인</a>
            <div className="w-px h-4 bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500">{studentName}님 · {sessionRound}차 면담 준비</p>
              <p className="text-sm font-semibold text-slate-800">나는 어떤 마케터일까?</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">응답함</p>
            <p className="text-sm font-bold text-slate-700">
              {answeredCount} <span className="font-normal text-slate-400">/ {TOTAL_QUESTIONS}개</span>
            </p>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-1 transition-all duration-300"
            style={{ width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`, backgroundColor: chartColor }} />
        </div>
      </div>

      {/* 모바일 차트 */}
      <div className="lg:hidden max-w-2xl mx-auto px-4 pt-4">{chartCard}</div>

      {/* 메인 레이아웃 */}
      <div className="max-w-5xl mx-auto px-4 pb-32 lg:flex lg:gap-8 lg:items-start">

        {/* 질문 영역 */}
        <div className="flex-1 min-w-0">
          {/* 안내 + 범례 */}
          <div className="py-3">
            <p className="text-sm text-slate-500 text-center mb-1.5">
              경험이 없어도 괜찮아요. 관심·성향·재미 기준으로 솔직하게 선택해 주세요.
            </p>
            {/* 범례 - 한 줄로 표시 */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-0">
              {ANSWER_OPTIONS.map((opt) => (
                <span key={opt.key} className="text-[10px] text-slate-400 whitespace-nowrap">
                  <span className={`font-semibold ${opt.key === 0 ? 'text-slate-400' : 'text-slate-600'}`}>
                    {opt.label}
                  </span>
                  {' '}{opt.desc}
                </span>
              ))}
            </div>
          </div>

          {/* 질문 카테고리별 */}
          {CATEGORIES.map((cat) => {
            const catQuestions = QUESTIONS.filter((q) => q.category === cat.key)
            if (!catQuestions.length) return null
            const catAnswered = catQuestions.filter((q) => answers[q.id] !== undefined).length

            return (
              <div key={cat.key} className="mb-4">
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-semibold text-slate-700">{cat.label}</span>
                  <span className="ml-auto text-xs text-slate-400">{catAnswered}/{catQuestions.length}</span>
                </div>

                <div className="space-y-1.5">
                  {catQuestions.map((q) => {
                    const selection = answers[q.id]
                    const isPositive = selection !== undefined && selection > 0
                    const isNegative = selection === 0

                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border px-3 py-2 transition-colors ${
                          isPositive ? 'border-blue-200 bg-blue-50/40'
                          : isNegative ? 'border-slate-300 bg-slate-50'
                          : 'border-slate-200 bg-white'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800 leading-snug mb-1.5">{q.text}</p>
                        <div className="grid grid-cols-5 gap-1">
                          {ANSWER_OPTIONS.map((opt) => {
                            const isSelected = selection === opt.key
                            const isHardOption = opt.key === 0
                            return (
                              <button
                                key={opt.key}
                                onClick={() => selectOption(q.id, opt.key)}
                                className={`py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                                  isSelected
                                    ? isHardOption
                                      ? 'bg-slate-400 text-white border-slate-400'
                                      : 'text-white border-transparent shadow-sm'
                                    : isHardOption
                                      ? 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-500'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                }`}
                                style={isSelected && !isHardOption ? { backgroundColor: chartColor, borderColor: chartColor } : {}}
                              >
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

        {/* 데스크톱 차트 — h-screen sticky, 세로 가운데 정렬 */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center w-[380px] shrink-0 sticky top-0 h-screen pt-[72px] pb-8">
          {chartCard}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-10">
        <div className="max-w-5xl mx-auto">
          {saveMsg && (
            <p className="text-center text-sm text-emerald-600 font-medium mb-2">{saveMsg}</p>
          )}
          {resetConfirm ? (
            <div className="flex gap-2 items-center">
              <p className="text-sm text-slate-500 shrink-0">정말 초기화할까요?</p>
              <button onClick={() => setResetConfirm(false)}
                className="flex-1 border border-slate-300 text-slate-600 font-semibold py-3 rounded-xl text-sm">
                취소
              </button>
              <button onClick={handleReset}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm">
                초기화
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setResetConfirm(true)}
                disabled={answeredCount === 0}
                className="border border-slate-300 disabled:border-slate-200 disabled:text-slate-300 text-slate-500 font-semibold py-3 px-4 rounded-xl text-sm"
              >
                초기화
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || answeredCount === 0}
                className="flex-1 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl text-sm transition-all"
                style={answeredCount > 0 ? { backgroundColor: chartColor } : {}}
              >
                {isPending ? '저장 중...' : saved ? `✓ 저장됨 (${answeredCount}개 응답)` : `${answeredCount}개 항목 저장하기`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
