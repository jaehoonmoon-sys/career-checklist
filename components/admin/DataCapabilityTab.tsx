'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ANSWER_WEIGHTS } from '@/lib/survey-questions'
import type { StudentRow, Ch5ProgressRow, QuizStudentRow } from '@/app/actions/admin'
import { getCh5Progress, getQuizResults } from '@/app/actions/admin'
import { syncCh5Progress } from '@/app/actions/sync'

const DATA_QS = [
  { id: 'c01', label: '광고 성과 지표(CTR, ROAS, CPA) 이해하고 싶다' },
  { id: 'c02', label: '숫자·표를 보며 분석하는 게 재미있다' },
  { id: 'c03', label: 'A/B 테스트처럼 실험해보고 싶다' },
  { id: 'c04', label: 'GA4·분석 툴로 방문자 데이터 들여다보고 싶다' },
  { id: 'c05', label: '복잡한 내용을 표나 그래프로 정리하는 편이다' },
]

const ANSWER_COLORS = ['#ef4444', '#94a3b8', '#3b82f6', '#8b5cf6', '#10b981']
const ANSWER_LABELS = ['어렵다', '잘모르겠다', '관심있다', '좋아한다', '꼭하고싶다']

const GROUP_CONFIG = [
  {
    key: 'high',
    label: '🔥 적극적 관심',
    range: '9~15점',
    color: '#059669',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'interested',
    label: '✅ 관심있음',
    range: '7~8점',
    color: '#2563eb',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-700',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'mild',
    label: '🌱 조금 관심',
    range: '4~6점',
    color: '#0891b2',
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-200',
    textClass: 'text-cyan-700',
    badgeClass: 'bg-cyan-100 text-cyan-700',
  },
  {
    key: 'neutral',
    label: '😐 보통',
    range: '0~3점',
    color: '#d97706',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-700',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'negative',
    label: '😰 어려움',
    range: '-5~-1점',
    color: '#dc2626',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-700',
    badgeClass: 'bg-red-100 text-red-700',
  },
] as const

type GroupKey = typeof GROUP_CONFIG[number]['key']

function getGroupKey(score: number): GroupKey {
  if (score >= 9) return 'high'
  if (score >= 7) return 'interested'
  if (score >= 4) return 'mild'
  if (score >= 0) return 'neutral'
  return 'negative'
}

function getGroupConfig(score: number) {
  return GROUP_CONFIG.find(g => g.key === getGroupKey(score))!
}

// 퀴즈 관련 상수
const QUIZ_Q_KEYS = ['q01','q02','q03','q04','q05','q06','q07','q08','q09','q10','q11','q12'] as const
type QuizQKey = typeof QUIZ_Q_KEYS[number]

const QUIZ_Q_LABELS: Record<QuizQKey, string> = {
  q01: '가격 인상률', q02: 'ROAS 계산', q03: '전환율 개념',
  q04: '전환율 계산', q05: '복리 성장', q06: 'CPC 계산',
  q07: 'CTR 해석', q08: '성과 우선순위', q09: 'CRM KPI',
  q10: 'COUNT 함수', q11: '절대 참조($)', q12: 'RAND 함수',
}

const QUIZ_CATEGORIES: Array<{ label: string; color: string; qs: QuizQKey[] }> = [
  { label: '지표 계산', color: '#2563eb', qs: ['q01', 'q02', 'q03', 'q04', 'q05', 'q06'] },
  { label: '해석·판단', color: '#7c3aed', qs: ['q07', 'q08', 'q09'] },
  { label: '실무 도구', color: '#0891b2', qs: ['q10', 'q11', 'q12'] },
]

function quizScoreColor(score: number): string {
  if (score === 120) return '#059669'
  if (score >= 100) return '#2563eb'
  if (score >= 80) return '#7c3aed'
  if (score >= 60) return '#d97706'
  return '#dc2626'
}

type ScoredStudent = StudentRow & { dataScore: number }

export default function DataCapabilityTab({ students }: { students: StudentRow[] }) {
  const [rankingFilter, setRankingFilter] = useState<GroupKey | 'all'>('all')
  const [expandedGroup, setExpandedGroup] = useState<GroupKey | null>(null)

  // CH.5 VOD 진도율 상태
  const [vodProgress, setVodProgress] = useState<Ch5ProgressRow[]>([])
  const [vodSortBy, setVodSortBy] = useState<'avg' | '309' | '319'>('avg')
  const [vodLoading, setVodLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)

  // 퀴즈 결과 상태
  const [quizResults, setQuizResults] = useState<QuizStudentRow[]>([])
  const [quizLoading, setQuizLoading] = useState(true)
  const [quizSortBy, setQuizSortBy] = useState<'score' | 'name'>('score')
  const [quizExpanded, setQuizExpanded] = useState<number | null>(null)

  const loadVodProgress = useCallback(async () => {
    setVodLoading(true)
    try {
      const data = await getCh5Progress()
      setVodProgress(data)
      const firstSynced = data.flatMap(d => d.courses).map(c => c.synced_at).filter(Boolean)[0]
      setSyncedAt(firstSynced ?? null)
    } finally {
      setVodLoading(false)
    }
  }, [])

  const loadQuizResults = useCallback(async () => {
    setQuizLoading(true)
    try {
      const data = await getQuizResults()
      setQuizResults(data)
    } finally {
      setQuizLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVodProgress()
    loadQuizResults()
  }, [loadVodProgress, loadQuizResults])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncMsg(null)
    const result = await syncCh5Progress()
    if (result.error) {
      setSyncMsg({ type: 'err', text: result.error })
    } else {
      setSyncMsg({ type: 'ok', text: `${result.synced}건 동기화 완료${result.skipped > 0 ? ` (미매핑 ${result.skipped}명 제외)` : ''}` })
      await loadVodProgress()
    }
    setSyncing(false)
  }, [loadVodProgress])

  const sortedVod = useMemo(() => {
    return [...vodProgress].sort((a, b) => {
      if (vodSortBy === 'avg') return b.avg_progress - a.avg_progress
      const courseId = Number(vodSortBy)
      const aRate = a.courses.find(c => c.course_id === courseId)?.progress_rate ?? 0
      const bRate = b.courses.find(c => c.course_id === courseId)?.progress_rate ?? 0
      return bRate - aRate
    })
  }, [vodProgress, vodSortBy])

  const vodStats = useMemo(() => {
    const withData = vodProgress.filter(s => s.avg_progress > 0)
    const completed309 = vodProgress.filter(s => s.courses.find(c => c.course_id === 309)?.is_completed).length
    const completed319 = vodProgress.filter(s => s.courses.find(c => c.course_id === 319)?.is_completed).length
    const avgAll = vodProgress.length > 0
      ? vodProgress.reduce((sum, s) => sum + s.avg_progress, 0) / vodProgress.length
      : 0
    return { withData: withData.length, completed309, completed319, avgAll }
  }, [vodProgress])

  const quizStats = useMemo(() => {
    const respondents = quizResults.filter(s => s.total_score >= 0)
    const perfect = respondents.filter(s => s.total_score === 120).length
    const below60 = respondents.filter(s => s.total_score < 60).length
    const avg = respondents.length > 0
      ? respondents.reduce((s, r) => s + r.total_score, 0) / respondents.length
      : 0
    const qAccuracy: Record<QuizQKey, number> = {} as Record<QuizQKey, number>
    for (const k of QUIZ_Q_KEYS) {
      const correct = respondents.filter(s => s[k]).length
      qAccuracy[k] = respondents.length > 0 ? Math.round((correct / respondents.length) * 100) : 0
    }
    return { respondentCount: respondents.length, perfect, below60, avg, qAccuracy }
  }, [quizResults])

  const sortedQuiz = useMemo(() => {
    return quizResults
      .filter(s => s.total_score >= 0)
      .sort((a, b) =>
        quizSortBy === 'score'
          ? b.total_score - a.total_score
          : a.student_name.localeCompare(b.student_name, 'ko')
      )
  }, [quizResults, quizSortBy])

  const scored = useMemo<ScoredStudent[]>(() => {
    return students
      .filter(s => Object.keys(s.answers).length > 0)
      .map(s => {
        const score = DATA_QS.reduce((sum, q) => {
          const v = s.answers[q.id]
          return sum + (v !== undefined ? (ANSWER_WEIGHTS[v] ?? 0) : 0)
        }, 0)
        return { ...s, dataScore: score }
      })
      .sort((a, b) => b.dataScore - a.dataScore)
  }, [students])

  const groupedStudents = useMemo<Record<GroupKey, ScoredStudent[]>>(() => {
    const result: Record<GroupKey, ScoredStudent[]> = {
      high: [], interested: [], mild: [], neutral: [], negative: [],
    }
    for (const s of scored) result[getGroupKey(s.dataScore)].push(s)
    return result
  }, [scored])

  const displayRanking = useMemo(() => {
    if (rankingFilter === 'all') return scored
    return groupedStudents[rankingFilter]
  }, [scored, groupedStudents, rankingFilter])

  const distribution = useMemo(() => {
    return DATA_QS.map(q => {
      const dist: { count: number; names: string[] }[] = Array.from({ length: 5 }, () => ({ count: 0, names: [] }))
      let total = 0
      for (const s of scored) {
        const v = s.answers[q.id]
        if (v !== undefined && v >= 0 && v <= 4) {
          dist[v].count++
          dist[v].names.push(s.student_name)
          total++
        }
      }
      const refuse = dist[0].count + dist[1].count
      return { ...q, dist, total, refuse, refusePct: total > 0 ? Math.round((refuse / total) * 100) : 0 }
    }).sort((a, b) => b.refusePct - a.refusePct)
  }, [scored])

  const avgScore = scored.length > 0
    ? (scored.reduce((s, r) => s + r.dataScore, 0) / scored.length).toFixed(1)
    : '—'

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{scored.length}명</p>
          <p className="text-xs text-slate-500 mt-0.5">응답자</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{avgScore}점</p>
          <p className="text-xs text-slate-500 mt-0.5">전체 평균</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{groupedStudents.high.length}명</p>
          <p className="text-xs text-emerald-600 mt-0.5">적극적 관심 (9점↑)</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{groupedStudents.negative.length}명</p>
          <p className="text-xs text-red-500 mt-0.5">어려움 (0점 미만)</p>
        </div>
      </div>

      {/* Section 1: 수강생별 랭킹 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">📊 수강생별 데이터 관심도 점수 랭킹</h3>

        {/* 그룹 필터 */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setRankingFilter('all')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              rankingFilter === 'all'
                ? 'bg-slate-700 text-white border-transparent'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            전체 {scored.length}명
          </button>
          {GROUP_CONFIG.map(g => (
            <button
              key={g.key}
              onClick={() => setRankingFilter(g.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                rankingFilter === g.key
                  ? 'text-white border-transparent'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
              style={rankingFilter === g.key ? { backgroundColor: g.color, borderColor: g.color } : {}}>
              {g.label} {groupedStudents[g.key].length}명
            </button>
          ))}
        </div>

        {/* 랭킹 리스트 */}
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
          {displayRanking.map((s, i) => {
            const gc = getGroupConfig(s.dataScore)
            const barWidth = s.dataScore <= 0 ? 0 : Math.round((s.dataScore / 15) * 100)
            const scoreLabel = s.dataScore > 0 ? `+${s.dataScore}` : String(s.dataScore)
            return (
              <div key={s.id} className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-400 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                <span className="text-xs font-medium text-slate-700 w-14 shrink-0 truncate">{s.student_name}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: gc.color }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold w-8 text-right shrink-0 tabular-nums"
                  style={{ color: gc.color }}>
                  {scoreLabel}
                </span>
              </div>
            )
          })}
          {displayRanking.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">해당 그룹에 수강생이 없습니다</p>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-3">점수 범위: -5점(모두 어렵다) ~ +15점(모두 꼭하고싶다)</p>
      </div>

      {/* Section 2: 구간별 그룹 분류 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">🗂️ 관심도 구간별 그룹 분류</h3>
        <p className="text-[11px] text-slate-400 mb-3">그룹 카드를 클릭하면 수강생 목록이 펼쳐집니다</p>
        <div className="grid grid-cols-2 gap-3">
          {GROUP_CONFIG.map(g => {
            const members = groupedStudents[g.key]
            const isExpanded = expandedGroup === g.key
            const pct = scored.length > 0 ? Math.round((members.length / scored.length) * 100) : 0
            return (
              <div key={g.key} className={`rounded-xl border p-3 ${g.bgClass} ${g.borderClass}`}>
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : g.key)}
                  className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-bold ${g.textClass}`}>{g.label}</p>
                      <p className={`text-[10px] ${g.textClass} opacity-70`}>{g.range}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${g.textClass}`}>{members.length}</p>
                      <p className={`text-[10px] ${g.textClass} opacity-70`}>{pct}% · {isExpanded ? '▲' : '▼'}</p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-black/10">
                    {members.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {members.map(s => (
                          <span
                            key={s.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/80"
                            style={{ color: g.color }}>
                            {s.student_name} <span className="opacity-60">({s.dataScore > 0 ? `+${s.dataScore}` : s.dataScore})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-[10px] ${g.textClass} opacity-50`}>해당 없음</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 3: 질문별 응답 분포 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-1">📈 질문별 응답 분포</h3>
        <p className="text-[11px] text-slate-400 mb-4">거부감(어렵다+잘모르겠다) 비율 높은 순 정렬</p>

        {/* 범례 */}
        <div className="flex gap-3 flex-wrap mb-4">
          {ANSWER_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ANSWER_COLORS[i] }} />
              <span className="text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {distribution.map(q => (
            <div key={q.id}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1.5">{q.id}</span>
                  <span className="text-xs text-slate-700">{q.label}</span>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  q.refusePct >= 40 ? 'bg-red-100 text-red-600' :
                  q.refusePct >= 20 ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  거부감 {q.refusePct}%
                </span>
              </div>

              {/* 스택 바 */}
              <div className="flex h-7 rounded-lg overflow-hidden">
                {q.dist.map((d, k) => {
                  if (!q.total || d.count === 0) return null
                  const w = (d.count / q.total) * 100
                  return (
                    <div
                      key={k}
                      className="flex items-center justify-center"
                      style={{ width: `${w}%`, backgroundColor: ANSWER_COLORS[k] }}
                      title={`${ANSWER_LABELS[k]}: ${d.count}명 (${Math.round(w)}%)\n${d.names.join(', ')}`}>
                      {w >= 8 && (
                        <span className="text-[10px] font-bold text-white">{d.count}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 수치 요약 */}
              <div className="flex gap-2.5 mt-1.5 flex-wrap">
                {q.dist.map((d, k) => {
                  if (d.count === 0) return null
                  const w = q.total > 0 ? Math.round((d.count / q.total) * 100) : 0
                  return (
                    <span key={k} className="text-[10px] text-slate-400">
                      <span style={{ color: ANSWER_COLORS[k] }}>●</span> {ANSWER_LABELS[k]} {d.count}명({w}%)
                    </span>
                  )
                })}
              </div>

              {/* 어렵다 선택자 */}
              {q.dist[0].names.length > 0 && (
                <div className="mt-1.5 flex items-start gap-1.5">
                  <span className="text-[10px] font-semibold text-red-500 shrink-0">어렵다 선택:</span>
                  <span className="text-[10px] text-slate-500">{q.dist[0].names.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: CH.5 VOD 진도율 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="text-sm font-bold text-slate-800">🎬 CH.5 강의 수강률</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">마케팅 심화: 퍼포먼스 마케팅의 이해 (2026.06.26~07.09)</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {syncedAt && (
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {new Date(syncedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 동기화
              </span>
            )}
            <button
              onClick={loadVodProgress}
              disabled={vodLoading || syncing}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              {vodLoading ? '로딩 중...' : '↻'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || vodLoading}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 transition-colors">
              {syncing ? '동기화 중...' : '⬇ Redash 동기화'}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className={`text-[11px] font-medium px-3 py-1.5 rounded-lg mb-3 ${
            syncMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {syncMsg.type === 'ok' ? '✓ ' : '✕ '}{syncMsg.text}
          </div>
        )}

        {syncing && (
          <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
            Redash에서 쿼리 실행 중입니다 (약 10~30초 소요)...
          </div>
        )}

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{vodStats.avgAll.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">전체 평균 진도율</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{vodStats.withData}명</p>
            <p className="text-[10px] text-slate-500 mt-0.5">수강 시작</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{vodStats.completed309}명</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">광고캠페인 완강</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{vodStats.completed319}명</p>
            <p className="text-[10px] text-blue-600 mt-0.5">성과측정 완강</p>
          </div>
        </div>

        {/* 정렬 버튼 */}
        <div className="flex gap-2 mb-3">
          {([
            { key: 'avg',  label: '평균 순' },
            { key: '309',  label: '광고캠페인 순' },
            { key: '319',  label: '성과측정 순' },
          ] as const).map(s => (
            <button
              key={s.key}
              onClick={() => setVodSortBy(s.key)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                vodSortBy === s.key
                  ? 'bg-slate-700 text-white border-transparent'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* 수강생 진도 리스트 */}
        {vodLoading ? (
          <p className="text-xs text-slate-400 text-center py-8">데이터 불러오는 중...</p>
        ) : vodStats.withData === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">아직 CH.5 수강 데이터가 동기화되지 않았어요</p>
            <p className="text-[11px] text-slate-300 mt-1">위 Redash 동기화 버튼을 눌러주세요</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto">
            {/* 헤더 */}
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="text-[10px] text-slate-400 w-5" />
              <span className="text-[10px] text-slate-400 w-14">이름</span>
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                <span className="text-[10px] text-slate-400 text-center">광고 캠페인의 이해</span>
                <span className="text-[10px] text-slate-400 text-center">성과측정 방법론</span>
              </div>
              <span className="text-[10px] text-slate-400 w-12 text-right shrink-0">평균</span>
            </div>

            {sortedVod.map((s, i) => {
              const c309 = s.courses.find(c => c.course_id === 309)
              const c319 = s.courses.find(c => c.course_id === 319)
              return (
                <div key={s.student_id} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                  <span className="text-xs font-medium text-slate-700 w-14 shrink-0 truncate">{s.student_name}</span>
                  <div className="flex-1 grid grid-cols-2 gap-1.5">
                    {[c309, c319].map((c, idx) => {
                      if (!c) return <div key={idx} />
                      const pct = Math.round(c.progress_rate)
                      const color = c.is_completed ? '#059669' : pct >= 50 ? '#2563eb' : pct > 0 ? '#d97706' : '#e2e8f0'
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <div className="flex items-center gap-0.5 w-10 shrink-0">
                            <span className="text-[10px] tabular-nums" style={{ color }}>{pct}%</span>
                            {c.is_completed && <span className="text-[9px] text-emerald-600">✓</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-[11px] font-bold w-12 text-right shrink-0 tabular-nums text-slate-600">
                    {s.avg_progress.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 범례 */}
        <div className="flex gap-3 flex-wrap mt-3 pt-3 border-t border-slate-100">
          {[
            { color: '#059669', label: '완강' },
            { color: '#2563eb', label: '50% 이상' },
            { color: '#d97706', label: '진행 중' },
            { color: '#e2e8f0', label: '미시작' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: 데이터 리터러시 퀴즈 결과 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="text-sm font-bold text-slate-800">📝 데이터 리터러시 퀴즈 결과</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">12문항 × 10점 = 120점 만점 · 2026.06.26 실시</p>
          </div>
          <button
            onClick={loadQuizResults}
            disabled={quizLoading}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shrink-0">
            {quizLoading ? '로딩 중...' : '↻'}
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-800">
              {quizStats.respondentCount}<span className="text-sm font-normal text-slate-400">/93</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              응답자 ({Math.round(quizStats.respondentCount / 93 * 100)}%)
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-800">
              {quizStats.avg.toFixed(1)}<span className="text-sm font-normal text-slate-400">점</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">평균 점수</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{quizStats.perfect}명</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">만점 (120점)</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-600">{quizStats.below60}명</p>
            <p className="text-[10px] text-red-500 mt-0.5">60점 미만</p>
          </div>
        </div>

        {/* 문항별 정답률 */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-700 mb-3">문항별 정답률</p>
          <div className="space-y-4">
            {QUIZ_CATEGORIES.map(cat => (
              <div key={cat.label}>
                <p className="text-[11px] font-bold mb-2" style={{ color: cat.color }}>
                  {cat.label}
                </p>
                <div className="space-y-1.5">
                  {cat.qs.map(qk => {
                    const acc = quizStats.qAccuracy[qk] ?? 0
                    const barColor = acc >= 80 ? '#059669' : acc >= 60 ? '#2563eb' : acc >= 40 ? '#d97706' : '#dc2626'
                    return (
                      <div key={qk} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-24 shrink-0">{QUIZ_Q_LABELS[qk]}</span>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${acc}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-bold w-9 text-right tabular-nums shrink-0"
                          style={{ color: barColor }}>
                          {acc}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap mt-3 pt-3 border-t border-slate-100">
            {[
              { color: '#059669', label: '80% 이상' },
              { color: '#2563eb', label: '60~79%' },
              { color: '#d97706', label: '40~59%' },
              { color: '#dc2626', label: '40% 미만' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 수강생별 점수 목록 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700">수강생별 점수</p>
            <div className="flex gap-1.5">
              {([
                { key: 'score', label: '점수 순' },
                { key: 'name',  label: '이름 순' },
              ] as const).map(s => (
                <button
                  key={s.key}
                  onClick={() => setQuizSortBy(s.key)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all ${
                    quizSortBy === s.key
                      ? 'bg-slate-700 text-white border-transparent'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {quizLoading ? (
            <p className="text-xs text-slate-400 text-center py-6">데이터 불러오는 중...</p>
          ) : (
            <div className="space-y-0.5 max-h-[520px] overflow-y-auto">
              {sortedQuiz.map((s, i) => {
                const color = quizScoreColor(s.total_score)
                const barWidth = Math.round((s.total_score / 120) * 100)
                const isExpanded = quizExpanded === s.student_id
                const correctCount = QUIZ_Q_KEYS.filter(k => s[k]).length
                return (
                  <div key={s.student_id}>
                    <button
                      onClick={() => setQuizExpanded(isExpanded ? null : s.student_id)}
                      className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-1 py-1 transition-colors">
                      <span className="text-[11px] text-slate-400 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                      <span className="text-xs font-medium text-slate-700 w-16 shrink-0 truncate">{s.student_name}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </div>
                      <span
                        className="text-[11px] font-bold w-12 text-right shrink-0 tabular-nums"
                        style={{ color }}>
                        {s.total_score}점
                      </span>
                      <span className="text-[10px] text-slate-300 shrink-0 w-3">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-7 mb-1.5 mt-0.5 bg-slate-50 rounded-xl p-3 space-y-2.5">
                        {QUIZ_CATEGORIES.map(cat => (
                          <div key={cat.label}>
                            <p className="text-[10px] font-bold mb-1.5" style={{ color: cat.color }}>{cat.label}</p>
                            <div className="flex flex-wrap gap-1">
                              {cat.qs.map(qk => {
                                const correct = s[qk]
                                return (
                                  <div
                                    key={qk}
                                    className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                      correct
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-600'
                                    }`}>
                                    <span>{correct ? '○' : '✕'}</span>
                                    <span>{QUIZ_Q_LABELS[qk]}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                          정답 {correctCount}/12문항
                          {s.submitted_at && (
                            <span className="ml-2">
                              · {new Date(s.submitted_at).toLocaleString('ko-KR', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
              {sortedQuiz.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">응답 데이터가 없습니다</p>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
