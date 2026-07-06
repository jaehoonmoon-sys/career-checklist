'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getCh5Progress, getQuizResults } from '@/app/actions/admin'
import type { StudentRow, QuizStudentRow, Ch5ProgressRow } from '@/app/actions/admin'
import { ANSWER_WEIGHTS } from '@/lib/survey-questions'

const EXCLUDED_NAMES = new Set([
  '유세희', '배아영', '최윤이', '김정은', '조유찬',
  '장예진', '송명석', '전수민', '강지수', '심효리',
])

const DATA_QS = [
  { id: 'c01', label: '광고 지표 이해 (CTR, ROAS, CPA)' },
  { id: 'c02', label: '숫자·표 분석' },
  { id: 'c03', label: 'A/B 테스트 실험' },
  { id: 'c04', label: 'GA4·분석 툴 활용' },
  { id: 'c05', label: '데이터 시각화' },
] as const

const DATA_Q_MAX = 15 // 5문항 × 최대 가중치 3

const ANSWER_LABELS = ['어렵다', '잘모르겠다', '관심있다', '좋아한다', '꼭하고싶다']
const ANSWER_COLORS = ['#ef4444', '#94a3b8', '#3b82f6', '#8b5cf6', '#10b981']

const QUIZ_CATS = [
  { label: '지표 계산', color: '#2563eb', qs: ['q01', 'q02', 'q03', 'q04', 'q05', 'q06'] as const },
  { label: '해석·판단', color: '#7c3aed', qs: ['q07', 'q08', 'q09'] as const },
  { label: '실무 도구', color: '#0891b2', qs: ['q10', 'q11', 'q12'] as const },
]

const ALL_Q_KEYS = ['q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09', 'q10', 'q11', 'q12'] as const
type QuizKey = typeof ALL_Q_KEYS[number]

const TIER = {
  high: { label: '상', color: '#059669', bg: '#d1fae5', border: '#6ee7b7', desc: '데이터 역량 우수' },
  mid:  { label: '중', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', desc: '발전 가능성 있음' },
  low:  { label: '하', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', desc: '집중 관리 필요' },
} as const

type CapScore = {
  student_id: number
  student_name: string
  interest_score: number
  quiz_score: number
  lecture_score: number
  composite: number
  tier: keyof typeof TIER
  interest_missing: boolean
  quiz_missing: boolean
  quiz_cat_pcts: [number, number, number]
  quiz_row: QuizStudentRow | null
  data_answers: Array<number | undefined>
  lecture_courses: Array<{ name: string; progress: number }>
}

function getTier(score: number): keyof typeof TIER {
  if (score >= 60) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}

function calcInterestRaw(answers: Record<string, number>): number {
  return DATA_QS.reduce((sum, q) => {
    const key = answers[q.id]
    return sum + (key !== undefined ? (ANSWER_WEIGHTS[key] ?? 0) : 0)
  }, 0)
}

export default function StudentCapabilityTab({ students: allStudents }: { students: StudentRow[] }) {
  const students = allStudents.filter(s => !EXCLUDED_NAMES.has(s.student_name))

  const [quizResults, setQuizResults] = useState<QuizStudentRow[]>([])
  const [lectureRows, setLectureRows] = useState<Ch5ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [quiz, lecture] = await Promise.all([getQuizResults(), getCh5Progress()])
    setQuizResults(quiz)
    setLectureRows(lecture)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const scores = useMemo((): CapScore[] => {
    if (!quizResults.length || !lectureRows.length) return []

    const quizMap = new Map(quizResults.map(r => [r.student_id, r]))
    const lectureMap = new Map(lectureRows.map(r => [r.student_id, r]))

    // 결측치 페널티 계산용 원시 평균
    const rawInterests = students
      .filter(s => DATA_QS.some(q => s.answers[q.id] !== undefined))
      .map(s => Math.max(0, calcInterestRaw(s.answers)) / DATA_Q_MAX * 100)
    const rawQuiz = quizResults
      .filter(r => r.total_score >= 0)
      .map(r => r.total_score / 120 * 100)

    const avgInterest = rawInterests.length ? rawInterests.reduce((a, b) => a + b, 0) / rawInterests.length : 50
    const avgQuiz = rawQuiz.length ? rawQuiz.reduce((a, b) => a + b, 0) / rawQuiz.length : 50
    const penaltyInterest = Math.round(avgInterest * 0.75)
    const penaltyQuiz = Math.round(avgQuiz * 0.75)

    return students.map(s => {
      const interestMissing = DATA_QS.every(q => s.answers[q.id] === undefined)
      const interest_score = interestMissing
        ? penaltyInterest
        : Math.round(Math.max(0, calcInterestRaw(s.answers)) / DATA_Q_MAX * 100)

      const qRow = quizMap.get(s.id) ?? null
      const quizMissing = !qRow || qRow.total_score < 0
      const quiz_score = quizMissing ? penaltyQuiz : Math.round(qRow!.total_score / 120 * 100)

      const lRow = lectureMap.get(s.id)
      const lecture_score = lRow ? Math.round(lRow.avg_progress) : 0

      const composite = Math.round(interest_score * 0.4 + quiz_score * 0.4 + lecture_score * 0.2)

      const quiz_cat_pcts: [number, number, number] = quizMissing || !qRow
        ? [0, 0, 0]
        : [
            Math.round(QUIZ_CATS[0].qs.filter(q => qRow[q]).length / QUIZ_CATS[0].qs.length * 100),
            Math.round(QUIZ_CATS[1].qs.filter(q => qRow[q]).length / QUIZ_CATS[1].qs.length * 100),
            Math.round(QUIZ_CATS[2].qs.filter(q => qRow[q]).length / QUIZ_CATS[2].qs.length * 100),
          ]

      return {
        student_id: s.id,
        student_name: s.student_name,
        interest_score,
        quiz_score,
        lecture_score,
        composite,
        tier: getTier(composite),
        interest_missing: interestMissing,
        quiz_missing: quizMissing,
        quiz_cat_pcts,
        quiz_row: qRow,
        data_answers: DATA_QS.map(q => s.answers[q.id]),
        lecture_courses: lRow
          ? lRow.courses.map(c => ({ name: c.course_name, progress: c.progress_rate }))
          : [],
      }
    }).sort((a, b) => b.composite - a.composite)
  }, [students, quizResults, lectureRows])

  const tierCounts = useMemo(() => ({
    high: scores.filter(s => s.tier === 'high').length,
    mid: scores.filter(s => s.tier === 'mid').length,
    low: scores.filter(s => s.tier === 'low').length,
  }), [scores])

  const avgs = useMemo(() => {
    if (!scores.length) return { interest: 0, quiz: 0, lecture: 0, composite: 0 }
    const n = scores.length
    return {
      interest: Math.round(scores.reduce((s, r) => s + r.interest_score, 0) / n),
      quiz: Math.round(scores.reduce((s, r) => s + r.quiz_score, 0) / n),
      lecture: Math.round(scores.reduce((s, r) => s + r.lecture_score, 0) / n),
      composite: Math.round(scores.reduce((s, r) => s + r.composite, 0) / n),
    }
  }, [scores])

  const avgQuizCat = useMemo((): [number, number, number] => {
    const submitted = scores.filter(s => !s.quiz_missing)
    if (!submitted.length) return [0, 0, 0]
    return [0, 1, 2].map(i =>
      Math.round(submitted.reduce((s, r) => s + r.quiz_cat_pcts[i], 0) / submitted.length)
    ) as [number, number, number]
  }, [scores])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center text-slate-400 text-sm">
        데이터 불러오는 중...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

      {/* 헤더 */}
      <div>
        <h2 className="text-base font-bold text-slate-900">수강생별 데이터 역량 평가</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          데이터 관심도 40% · 퀴즈 역량 40% · CH.5 수강률 20%를 반영한 종합 점수입니다.
          미제출 항목은 전체 평균의 75%로 계산합니다. (분류 기준: 상 ≥ 60점, 중 40~60점, 하 &lt; 40점)
        </p>
      </div>

      {/* 그룹 분포 */}
      <div className="grid grid-cols-3 gap-3">
        {(['high', 'mid', 'low'] as const).map(t => {
          const cfg = TIER[t]
          const cnt = tierCounts[t]
          return (
            <div key={t} className="bg-white rounded-2xl border p-4 text-center"
              style={{ borderColor: cfg.border }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: cfg.color }}>
                {cfg.label} 그룹
              </p>
              <p className="text-3xl font-bold" style={{ color: cfg.color }}>{cnt}명</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {scores.length > 0 ? Math.round(cnt / scores.length * 100) : 0}% · {cfg.desc}
              </p>
            </div>
          )
        })}
      </div>

      {/* 전체 평균 점수 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">전체 평균 점수</p>
        <div className="grid grid-cols-4 gap-4">
          {([
            { label: '종합', v: avgs.composite, color: '#6366f1' },
            { label: '데이터 관심도', v: avgs.interest, color: '#10b981' },
            { label: '퀴즈 역량', v: avgs.quiz, color: '#8b5cf6' },
            { label: 'CH.5 수강률', v: avgs.lecture, color: '#f59e0b' },
          ] as const).map(({ label, v, color }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold" style={{ color }}>
                {v}<span className="text-xs font-normal text-slate-400">점</span>
              </p>
              <p className="text-[10px] text-slate-500 mb-1.5">{label}</p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 수강생 목록 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">
          전체 {scores.length}명 · 종합 점수 높은 순
          <span className="font-normal text-slate-400 ml-2">│ 세로 막대(|) = 전체 평균</span>
        </p>

        {scores.map((s, idx) => {
          const t = TIER[s.tier]
          const isOpen = expanded === s.student_id

          return (
            <div key={s.student_id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {/* 요약 행 */}
              <button
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : s.student_id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-5 text-right shrink-0">{idx + 1}</span>
                  <span className="font-medium text-sm text-slate-800 flex-1 truncate">{s.student_name}</span>
                  <div className="flex gap-1 shrink-0">
                    {s.interest_missing && (
                      <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">
                        체크리스트 미제출
                      </span>
                    )}
                    {s.quiz_missing && (
                      <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">
                        퀴즈 미제출
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: t.color }}>
                    {s.composite}점
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: t.color, backgroundColor: t.bg }}>
                    {t.label}
                  </span>
                  <span className="text-slate-300 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* 미니 바 3개 */}
                <div className="grid grid-cols-3 gap-2 mt-2 ml-7">
                  {([
                    { label: '관심도', v: s.interest_score, avg: avgs.interest, color: '#10b981' },
                    { label: '퀴즈', v: s.quiz_score, avg: avgs.quiz, color: '#8b5cf6' },
                    { label: '수강률', v: s.lecture_score, avg: avgs.lecture, color: '#f59e0b' },
                  ] as const).map(({ label, v, avg, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] text-slate-400">{label}</span>
                        <span className="text-[10px] font-medium text-slate-600">{v}</span>
                      </div>
                      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${v}%`, backgroundColor: color }} />
                        <div className="absolute top-0 h-full w-px bg-slate-400 opacity-50"
                          style={{ left: `${avg}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </button>

              {/* 확장: 수강생 상세 */}
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 space-y-5">

                  {/* 1. 데이터 관심도 */}
                  <section>
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <span className="text-xs font-bold text-slate-700">📊 데이터 관심도</span>
                      <span className="text-xs font-bold text-emerald-600">{s.interest_score}점</span>
                      <span className="text-[10px] text-slate-400">/ 전체 평균 {avgs.interest}점</span>
                      {s.interest_missing && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          미제출 — 평균의 75% 적용
                        </span>
                      )}
                    </div>
                    {s.interest_missing ? (
                      <p className="text-[11px] text-slate-400">체크리스트를 제출하지 않아 세부 데이터가 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {DATA_QS.map((q, i) => {
                          const raw = s.data_answers[i]
                          const ansLabel = raw !== undefined ? ANSWER_LABELS[raw] : '미응답'
                          const ansColor = raw !== undefined ? ANSWER_COLORS[raw] : '#cbd5e1'
                          const barPct = raw !== undefined
                            ? Math.max(0, ANSWER_WEIGHTS[raw]) / 3 * 100
                            : 0
                          return (
                            <div key={q.id} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-44 shrink-0 truncate">{q.label}</span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                                style={{ backgroundColor: `${ansColor}18`, color: ansColor }}>
                                {ansLabel}
                              </span>
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width: `${barPct}%`, backgroundColor: ansColor }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  {/* 2. 퀴즈 역량 */}
                  <section>
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <span className="text-xs font-bold text-slate-700">🧠 퀴즈 역량</span>
                      <span className="text-xs font-bold text-violet-600">{s.quiz_score}점</span>
                      <span className="text-[10px] text-slate-400">/ 전체 평균 {avgs.quiz}점</span>
                      {s.quiz_missing && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          미제출 — 평균의 75% 적용
                        </span>
                      )}
                    </div>
                    {s.quiz_missing ? (
                      <p className="text-[11px] text-slate-400">퀴즈를 제출하지 않아 세부 데이터가 없습니다.</p>
                    ) : (
                      <>
                        <div className="space-y-2 mb-3">
                          {QUIZ_CATS.map((cat, i) => {
                            const pct = s.quiz_cat_pcts[i]
                            const avg = avgQuizCat[i]
                            return (
                              <div key={cat.label}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="text-[10px] font-semibold" style={{ color: cat.color }}>
                                    {cat.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {pct}%
                                    <span className="text-slate-400"> (평균 {avg}%)</span>
                                  </span>
                                </div>
                                <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                                  <div className="absolute top-0 h-full w-px bg-slate-500 opacity-50"
                                    style={{ left: `${avg}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* O/X 칩 */}
                        <div className="flex flex-wrap gap-1">
                          {ALL_Q_KEYS.map(q => {
                            const correct = s.quiz_row![q as QuizKey] as boolean
                            return (
                              <span key={q}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: correct ? '#d1fae5' : '#fee2e2',
                                  color: correct ? '#065f46' : '#991b1b',
                                }}>
                                {q.slice(1)} {correct ? 'O' : 'X'}
                              </span>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </section>

                  {/* 3. CH.5 수강률 */}
                  <section>
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <span className="text-xs font-bold text-slate-700">🎬 CH.5 수강률</span>
                      <span className="text-xs font-bold text-amber-500">{s.lecture_score}점</span>
                      <span className="text-[10px] text-slate-400">/ 전체 평균 {avgs.lecture}점</span>
                    </div>
                    {s.lecture_courses.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        수강 데이터가 없습니다. 데이터 역량 탭에서 Redash 동기화를 먼저 실행해 주세요.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {s.lecture_courses.map(c => (
                          <div key={c.name}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] text-slate-500">{c.name}</span>
                              <span className="text-[10px] font-medium text-slate-600">{c.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-amber-400"
                                style={{ width: `${c.progress}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
