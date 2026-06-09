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

type Props = {
  initialAnswers: Record<string, number[]>
  sessionRound: number
  studentName: string
}

export default function CompetencyChecklist({ initialAnswers, sessionRound, studentName }: Props) {
  const [answers, setAnswers] = useState<Record<string, number[]>>(initialAnswers)
  const [saved, setSaved] = useState(Object.keys(initialAnswers).length > 0)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const answeredCount = Object.keys(answers).filter((k) => answers[k].length > 0).length
  const totalChecked = Object.values(answers).reduce((s, v) => s + v.length, 0)

  const jobScores = useMemo(() => calcJobScores(answers), [answers])

  const radarData = JOB_ORDER.map((job) => ({
    subject: JOB_LABELS[job],
    value: Math.round((jobScores[job] / MAX_SCORES[job]) * 100),
    fullMark: 100,
  }))

  const topJob = JOB_ORDER.reduce((a, b) => jobScores[a] >= jobScores[b] ? a : b)

  const toggle = (qId: string, optKey: number) => {
    setSaved(false)
    setAnswers((prev) => {
      const cur = prev[qId] ?? []
      return {
        ...prev,
        [qId]: cur.includes(optKey)
          ? cur.filter((k) => k !== optKey)
          : [...cur, optKey],
      }
    })
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCompetencyAnswers(sessionRound, answers)
      if (result?.error) { setSaveMsg(result.error) }
      else { setSaved(true); setSaveMsg('저장됐어요!'); setTimeout(() => setSaveMsg(''), 2000) }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">{studentName}님 · {sessionRound}차 면담 준비</p>
            <p className="text-sm font-semibold text-slate-800">나는 어떤 마케터일까?</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">선택됨</p>
            <p className="text-sm font-bold text-slate-700">
              {answeredCount} <span className="font-normal text-slate-400">/ 30개</span>
            </p>
          </div>
        </div>
        {/* 진행바 */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-blue-500 transition-all duration-300"
            style={{ width: `${(answeredCount / 30) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-32">
        {/* 안내 문구 */}
        <div className="py-4 text-center">
          <p className="text-sm text-slate-500">경험이 없어도 괜찮습니다.</p>
          <p className="text-sm text-slate-500">관심·성향·재미를 기준으로 솔직하게 체크해 주세요.</p>
          <p className="text-xs text-slate-400 mt-1">체크할수록 결과가 정확해집니다 ✨</p>
        </div>

        {/* 레이더 차트 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <p className="text-xs text-slate-400 text-center mb-1">직무 지향점</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid gridType="polygon" stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.35}
                dot={{ r: 3, fill: '#3b82f6' }}
                animationDuration={300}
              />
            </RadarChart>
          </ResponsiveContainer>
          {totalChecked > 0 && (
            <p className="text-center text-xs text-blue-600 font-medium mt-1">
              ✨ 가장 잘 맞는 직무: {JOB_LABELS[topJob].replace('\n', ' ')}
            </p>
          )}
        </div>

        {/* 질문 카테고리별 */}
        {CATEGORIES.map((cat) => {
          const catQuestions = QUESTIONS.filter((q) => q.category === cat.key)
          if (!catQuestions.length) return null
          const catAnswered = catQuestions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length

          return (
            <div key={cat.key} className="mb-5">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-base">{cat.emoji}</span>
                <span className="text-sm font-semibold text-slate-700">{cat.label}</span>
                <span className="ml-auto text-xs text-slate-400">{catAnswered}/{catQuestions.length}</span>
              </div>

              <div className="space-y-3">
                {catQuestions.map((q) => {
                  const checked = answers[q.id] ?? []
                  const isAnswered = checked.length > 0

                  return (
                    <div
                      key={q.id}
                      className={`bg-white rounded-xl border p-4 transition-colors ${
                        isAnswered ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                      }`}
                    >
                      <p className="text-sm text-slate-800 leading-relaxed mb-3">{q.text}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ANSWER_OPTIONS.map((opt) => {
                          const isChecked = checked.includes(opt.key)
                          return (
                            <button
                              key={opt.key}
                              onClick={() => toggle(q.id, opt.key)}
                              className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                                isChecked
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                              }`}
                            >
                              <div className="font-semibold">{opt.label}</div>
                              <div className={`text-[10px] mt-0.5 ${isChecked ? 'text-blue-100' : 'text-slate-400'}`}>
                                {opt.desc}
                              </div>
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

      {/* 하단 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-2xl mx-auto">
          {saveMsg && (
            <p className="text-center text-sm text-emerald-600 font-medium mb-2">{saveMsg}</p>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || totalChecked === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {isPending
              ? '저장 중...'
              : saved
              ? `✓ 저장됨 (${answeredCount}개 응답)`
              : `${answeredCount}개 항목 저장하기`}
          </button>
        </div>
      </div>
    </div>
  )
}
