'use client'

import { useState, useTransition } from 'react'
import { saveCompetencyAnswers } from '@/app/actions/checklist'

type Item = { id: string; job_type: string; item_text: string; order_index: number }

type Props = {
  items: Item[]
  initialAnswers: Record<string, number>
  sessionRound: number
  studentName: string
}

const JOB_CONFIG: Record<string, { label: string; emoji: string; bg: string; border: string; badge: string; bar: string }> = {
  performance: {
    label: '퍼포먼스 마케터',
    emoji: '📊',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    bar: 'bg-blue-500',
  },
  content: {
    label: '콘텐츠 마케터',
    emoji: '✍️',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    bar: 'bg-violet-500',
  },
  brand: {
    label: '브랜드 마케터',
    emoji: '🎨',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    bar: 'bg-pink-500',
  },
  growth: {
    label: '그로스 마케터',
    emoji: '📈',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
  },
  crm: {
    label: 'CRM 마케터',
    emoji: '💌',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    bar: 'bg-orange-500',
  },
  ae: {
    label: 'AE (광고대행사)',
    emoji: '🤝',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700',
    bar: 'bg-indigo-500',
  },
}

const OPTIONS = [
  { value: 1, label: '관심있다', sub: '배우고 싶어요' },
  { value: 2, label: '공부해봤다', sub: '학습한 경험 있어요' },
  { value: 3, label: '해봤다', sub: '직접 해봤어요' },
]

const JOB_ORDER = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']

export default function CompetencyChecklist({ items, initialAnswers, sessionRound, studentName }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)
  const [saved, setSaved] = useState(Object.keys(initialAnswers).length > 0)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const grouped = JOB_ORDER.reduce<Record<string, Item[]>>((acc, type) => {
    acc[type] = items.filter((i) => i.job_type === type)
    return acc
  }, {})

  const answeredCount = Object.values(answers).filter((v) => v > 0).length
  const totalCount = items.length

  const scoreOf = (type: string) =>
    (grouped[type] ?? []).reduce((sum, item) => sum + (answers[item.id] ?? 0), 0)

  const handleSelect = (itemId: string, value: number) => {
    setAnswers((prev) => {
      const next = { ...prev }
      if (next[itemId] === value) {
        delete next[itemId]
      } else {
        next[itemId] = value
      }
      return next
    })
    setSaved(false)
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCompetencyAnswers(sessionRound, answers)
      if (result?.error) {
        setSaveMsg(result.error)
      } else {
        setSaved(true)
        setSaveMsg('저장됐어요!')
        setTimeout(() => setSaveMsg(''), 2000)
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{studentName}님의 직무 강점 진단</h2>
          <p className="text-sm text-slate-500 mt-0.5">{sessionRound}차 면담 준비</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-slate-800">{answeredCount}</span>
          <span className="text-slate-400 text-sm"> / {totalCount}</span>
          <p className="text-xs text-slate-400">문항 응답</p>
        </div>
      </div>

      {/* 진행률 */}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(answeredCount / totalCount) * 100}%` }}
        />
      </div>

      {/* 직무별 섹션 */}
      {JOB_ORDER.map((type) => {
        const cfg = JOB_CONFIG[type]
        const score = scoreOf(type)
        const maxScore = (grouped[type]?.length ?? 0) * 3

        return (
          <div key={type} className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
            {/* 직무 헤더 */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cfg.emoji}</span>
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-white/60 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${cfg.bar}`}
                    style={{ width: `${(score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700">{score}<span className="font-normal text-slate-400">/{maxScore}</span></span>
              </div>
            </div>

            {/* 문항 목록 */}
            <div className="divide-y divide-white/50">
              {(grouped[type] ?? []).map((item) => {
                const selected = answers[item.id] ?? 0
                return (
                  <div key={item.id} className="bg-white/70 px-5 py-4">
                    <p className="text-sm text-slate-800 mb-3 leading-relaxed">
                      <span className="text-slate-400 text-xs mr-2">{item.id}</span>
                      {item.item_text}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSelect(item.id, opt.value)}
                          className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                            selected === opt.value
                              ? `${cfg.bar.replace('bg-', 'bg-')} text-white border-transparent shadow-sm scale-[1.02]`
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={selected === opt.value ? 'text-white' : 'text-slate-700'}>
                            {opt.label}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selected === opt.value ? 'text-white/80' : 'text-slate-400'}`}>
                            {opt.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 저장 버튼 */}
      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={isPending || answeredCount === 0}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all shadow-lg"
        >
          {isPending ? '저장 중...' : saved ? '✓ 저장됨 — 다시 저장' : `${answeredCount}개 응답 저장하기`}
        </button>
        {saveMsg && (
          <p className="text-center text-sm text-emerald-600 mt-2 font-medium">{saveMsg}</p>
        )}
      </div>

      {/* 결과 요약 (저장 후 표시) */}
      {saved && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">직무별 강점 요약</h3>
          <div className="space-y-3">
            {JOB_ORDER
              .map((type) => ({ type, score: scoreOf(type), cfg: JOB_CONFIG[type] }))
              .sort((a, b) => b.score - a.score)
              .map(({ type, score, cfg }) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm w-36 text-slate-700 shrink-0">{cfg.emoji} {cfg.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${cfg.bar}`}
                      style={{ width: `${(score / 15) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-10 text-right">{score}/15</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
