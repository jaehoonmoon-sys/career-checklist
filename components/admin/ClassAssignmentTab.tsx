'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getCh5Progress, getQuizResults } from '@/app/actions/admin'
import type { StudentRow } from '@/app/actions/admin'
import { ANSWER_WEIGHTS } from '@/lib/survey-questions'
import {
  syncClassSelection,
  getClassSelectionData,
  getClassOverrides,
  saveClassOverride,
  deleteClassOverride,
  type ClassType,
  type ClassSelectionRow,
  type ClassOverrideRow,
} from '@/app/actions/assignment'

// ── Constants ────────────────────────────────────────────────────────────────

const EXCLUDED_NAMES = new Set([
  '유세희', '배아영', '최윤이', '김정은', '조유찬',
  '장예진', '송명석', '전수민', '강지수', '심효리',
])

const SHEET_TO_DB_NAME: Record<string, string> = {
  '엄채현': '엄시은',
}

const DATA_QS = ['c01', 'c02', 'c03', 'c04', 'c05'] as const
const DATA_Q_MAX = 15

const CLASS_CFG: Record<ClassType, {
  label: string; tutors: string; level: number
  color: string; bg: string; border: string; lightBg: string
}> = {
  content: {
    label: '콘텐츠 마케팅', tutors: '강윤영 T · 이현주 T', level: 1,
    color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', lightBg: '#f5f3ff',
  },
  content_data: {
    label: '콘텐츠 + 데이터', tutors: '박정은 T · 배지은 T', level: 2,
    color: '#0891b2', bg: '#cffafe', border: '#a5f3fc', lightBg: '#f0fdff',
  },
  data: {
    label: '데이터 마케팅', tutors: '김현전 T · 조혜령 T', level: 3,
    color: '#059669', bg: '#d1fae5', border: '#6ee7b7', lightBg: '#f0fdf4',
  },
}

const TIER_CFG = {
  high: { label: '상', level: 3, color: '#059669', bg: '#d1fae5' },
  mid:  { label: '중', level: 2, color: '#d97706', bg: '#fef3c7' },
  low:  { label: '하', level: 1, color: '#dc2626', bg: '#fee2e2' },
} as const

type TierKey = keyof typeof TIER_CFG
type MatchStatus = 'match' | 'underplacing' | 'overreaching' | 'unknown'

const CLASS_TYPES: ClassType[] = ['content', 'content_data', 'data']

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcTierData(
  answers: Record<string, number>,
  quizScore: number,
  lectureScore: number,
  penaltyInterest: number,
): { tier: TierKey; composite: number; interestScore: number; quizScore: number; lectureScore: number } {
  const interestMissing = DATA_QS.every(q => answers[q] === undefined)
  const interestScore = interestMissing
    ? penaltyInterest
    : Math.round(Math.max(0, DATA_QS.reduce((s, q) => {
        const k = answers[q]
        return s + (k !== undefined ? (ANSWER_WEIGHTS[k] ?? 0) : 0)
      }, 0)) / DATA_Q_MAX * 100)
  const composite = Math.round(interestScore * 0.4 + quizScore * 0.4 + lectureScore * 0.2)
  const tier: TierKey = composite >= 60 ? 'high' : composite >= 40 ? 'mid' : 'low'
  return { tier, composite, interestScore, quizScore, lectureScore }
}

function getMatchStatus(tier: TierKey | null, classType: ClassType): MatchStatus {
  if (!tier) return 'unknown'
  const tl = TIER_CFG[tier].level
  const cl = CLASS_CFG[classType].level
  if (tl === cl) return 'match'
  return tl > cl ? 'underplacing' : 'overreaching'
}

// ── Types ────────────────────────────────────────────────────────────────────

type StudentEntry = {
  student_name: string
  chosen_class: ClassType
  current_class: ClassType
  tier: TierKey | null
  composite: number | null
  interest_score: number | null
  quiz_score: number | null
  lecture_score: number | null
  content_pref: number | null
  content_data_pref: number | null
  data_pref: number | null
  reason: string | null
  difficult_parts: string | null
  match_status: MatchStatus
  is_overridden: boolean
  moved_by: string | null
  move_reason: string | null
  previous_chosen_class: ClassType | null
  resubmit_count: number
}

type UnsubmittedStudent = {
  student_name: string
  tier: TierKey | null
  composite: number | null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PrefDot({ value }: { value: number | null }) {
  if (!value) return <span className="text-slate-300 text-xs">-</span>
  const color = value >= 6 ? '#059669' : value >= 4 ? '#d97706' : '#dc2626'
  return (
    <span className="text-xs font-bold" style={{ color }}>
      {value}<span className="text-[9px] font-normal text-slate-400">/7</span>
    </span>
  )
}

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>{value}점</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function StudentCard({
  entry,
  expanded,
  scoreExpanded,
  onToggle,
  onScoreToggle,
  onOpenMoveModal,
  moving,
}: {
  entry: StudentEntry
  expanded: boolean
  scoreExpanded: boolean
  onToggle: () => void
  onScoreToggle: () => void
  onOpenMoveModal: () => void
  moving: boolean
}) {
  const {
    student_name, tier, composite, match_status, is_overridden,
    chosen_class, current_class, content_pref, content_data_pref, data_pref,
    reason, difficult_parts, moved_by, move_reason,
    interest_score, quiz_score, lecture_score,
    previous_chosen_class, resubmit_count,
  } = entry

  const tierCfg = tier ? TIER_CFG[tier] : null

  const matchColors: Record<MatchStatus, string> = {
    match: '#10b981', underplacing: '#f59e0b', overreaching: '#f43f5e', unknown: '#94a3b8',
  }
  const matchLabels: Record<MatchStatus, string> = {
    match: '적합', underplacing: '낮은 반', overreaching: '높은 반', unknown: '미확인',
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        is_overridden ? 'bg-slate-100' : 'bg-white'
      }`}
      style={{ borderColor: matchColors[match_status] + '55' }}
    >
      <div className="flex">
        <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: matchColors[match_status] }} />

        <div className="flex-1 min-w-0 p-2.5">
          {/* 헤더 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 flex-1 truncate min-w-0">
              {student_name}
            </span>

            {is_overridden && (
              <span className="text-[9px] bg-slate-400 text-white px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                이동됨
              </span>
            )}

            {resubmit_count > 1 && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                재제출
              </span>
            )}

            {tierCfg && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ color: tierCfg.color, backgroundColor: tierCfg.bg }}>
                {tierCfg.label} {composite !== null && <span className="font-normal text-[9px]">{composite}점</span>}
              </span>
            )}

            {!tierCfg && (
              <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full shrink-0">
                역량 미확인
              </span>
            )}

            <button
              onClick={e => { e.stopPropagation(); onOpenMoveModal() }}
              disabled={moving}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 shrink-0 disabled:opacity-50"
            >
              {moving ? '...' : '이동'}
            </button>

            <button onClick={onToggle} className="text-slate-300 text-xs shrink-0 hover:text-slate-500">
              {expanded ? '▲' : '▼'}
            </button>
          </div>

          {/* 이동 정보 표시 */}
          {is_overridden && chosen_class !== current_class && (
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-medium" style={{ color: CLASS_CFG[chosen_class].color }}>
                {CLASS_CFG[chosen_class].label}
              </span>
              <span className="text-[10px] text-slate-400">→</span>
              <span className="text-[10px] font-medium" style={{ color: CLASS_CFG[current_class].color }}>
                {CLASS_CFG[current_class].label}
              </span>
              {moved_by && (
                <span className="text-[10px] text-slate-400 ml-1">({moved_by})</span>
              )}
            </div>
          )}

          {/* 상세 패널 */}
          {expanded && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2">

              {/* 재제출 정보 */}
              {resubmit_count > 1 && previous_chosen_class && previous_chosen_class !== chosen_class && (
                <div className="text-[10px] bg-amber-50 border border-amber-100 rounded-lg p-1.5">
                  <span className="text-amber-700 font-medium">재제출 변경: </span>
                  <span style={{ color: CLASS_CFG[previous_chosen_class].color }}>
                    {CLASS_CFG[previous_chosen_class].label}
                  </span>
                  <span className="text-amber-600"> → </span>
                  <span style={{ color: CLASS_CFG[chosen_class].color }}>
                    {CLASS_CFG[chosen_class].label}
                  </span>
                </div>
              )}

              {/* 선호도 */}
              <div>
                <p className="text-[10px] text-slate-400 mb-1">선호도</p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {([
                    { label: '콘마', val: content_pref, cls: 'content' as ClassType },
                    { label: '콘데', val: content_data_pref, cls: 'content_data' as ClassType },
                    { label: '데마', val: data_pref, cls: 'data' as ClassType },
                  ] as const).map(({ label, val, cls }) => (
                    <div key={label} className="rounded-lg p-1"
                      style={{ backgroundColor: cls === current_class ? CLASS_CFG[cls].bg : '#f8fafc' }}>
                      <p className="text-[9px] text-slate-500">{label}</p>
                      <PrefDot value={val} />
                    </div>
                  ))}
                </div>
              </div>

              {reason && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">선택 이유</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{reason}</p>
                </div>
              )}

              {difficult_parts && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">어려웠던 내용</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{difficult_parts}</p>
                </div>
              )}

              {move_reason && is_overridden && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">이동 사유</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{move_reason}</p>
                </div>
              )}

              {/* 역량 점수 2단계 토글 */}
              <div className="pt-1 border-t border-slate-200">
                <button
                  onClick={e => { e.stopPropagation(); onScoreToggle() }}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                >
                  {scoreExpanded ? '▲' : '▼'} 역량 세부 점수 {scoreExpanded ? '접기' : '보기'}
                </button>

                {scoreExpanded && (
                  <div className="mt-2 space-y-2">
                    {interest_score !== null && (
                      <ScoreBar
                        value={interest_score}
                        label="진로체크리스트 데이터 선호도"
                        color="#6366f1"
                      />
                    )}
                    {quiz_score !== null && (
                      <ScoreBar
                        value={quiz_score}
                        label="리터러시 퀴즈 정답률"
                        color="#0891b2"
                      />
                    )}
                    {lecture_score !== null && (
                      <ScoreBar
                        value={lecture_score}
                        label="강의 수강률"
                        color="#059669"
                      />
                    )}
                    {interest_score === null && quiz_score === null && lecture_score === null && (
                      <p className="text-[10px] text-slate-400">역량 데이터 없음</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MoveModal ─────────────────────────────────────────────────────────────────

function MoveModal({
  entry,
  onConfirm,
  onCancel,
  saving,
}: {
  entry: StudentEntry
  onConfirm: (targetClass: ClassType, movedBy: string, moveReason: string) => void
  onCancel: () => void
  saving: boolean
}) {
  const [targetClass, setTargetClass] = useState<ClassType | null>(null)
  const [movedBy, setMovedBy] = useState('')
  const [moveReason, setMoveReason] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)

  const otherClasses = CLASS_TYPES.filter(c => c !== entry.current_class)
  const canSubmit = (targetClass !== null || isRestoring) && movedBy.trim() !== '' && moveReason.trim() !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    const target = isRestoring ? entry.chosen_class : targetClass!
    onConfirm(target, movedBy.trim(), moveReason.trim())
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <h3 className="text-sm font-bold text-slate-900 mb-1">분반 이동</h3>
        <p className="text-xs text-slate-500 mb-4">
          <span className="font-medium text-slate-700">{entry.student_name}</span>
          {' · 현재: '}
          <span className="font-medium" style={{ color: CLASS_CFG[entry.current_class].color }}>
            {CLASS_CFG[entry.current_class].label}
          </span>
        </p>

        {/* 이동 대상 선택 */}
        <p className="text-[11px] text-slate-500 mb-1.5 font-medium">이동할 분반 *</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {otherClasses.map(cls => {
            const cfg = CLASS_CFG[cls]
            const selected = !isRestoring && targetClass === cls
            return (
              <button
                key={cls}
                onClick={() => { setTargetClass(cls); setIsRestoring(false) }}
                className="text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all"
                style={{
                  borderColor: selected ? cfg.color : cfg.border,
                  color: cfg.color,
                  backgroundColor: selected ? cfg.bg : 'white',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
          {entry.is_overridden && entry.chosen_class !== entry.current_class && (
            <button
              onClick={() => { setIsRestoring(true); setTargetClass(null) }}
              className={`text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all ${
                isRestoring
                  ? 'border-slate-500 bg-slate-100 text-slate-700'
                  : 'border-slate-200 text-slate-500 bg-white'
              }`}
            >
              원래 반으로 복원
            </button>
          )}
        </div>

        {/* 담당자 */}
        <label className="block mb-3">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">담당자 이름 *</span>
          <input
            type="text"
            value={movedBy}
            onChange={e => setMovedBy(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </label>

        {/* 이동 사유 */}
        <label className="block mb-4">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">이동 사유 *</span>
          <textarea
            value={moveReason}
            onChange={e => setMoveReason(e.target.value)}
            placeholder="이동 사유를 입력하세요"
            rows={3}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '이동 확정'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── StudentSection ────────────────────────────────────────────────────────────

function StudentSection({
  title, subtitle, indicator, entries,
  expanded, scoreExpanded, onToggle, onScoreToggle,
  onOpenMoveModal, moving,
}: {
  title: string
  subtitle?: string
  indicator: string
  entries: StudentEntry[]
  expanded: string | null
  scoreExpanded: string | null
  onToggle: (name: string) => void
  onScoreToggle: (name: string) => void
  onOpenMoveModal: (name: string) => void
  moving: string | null
}) {
  if (entries.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: indicator }} />
        <span className="text-[11px] font-semibold text-slate-600">{title}</span>
        <span className="text-[10px] text-slate-400 ml-auto">{entries.length}명</span>
      </div>
      {subtitle && (
        <p className="text-[10px] text-slate-400 mb-1.5 px-0.5">{subtitle}</p>
      )}
      <div className="space-y-1.5">
        {entries.map(entry => (
          <StudentCard
            key={entry.student_name}
            entry={entry}
            expanded={expanded === entry.student_name}
            scoreExpanded={scoreExpanded === entry.student_name}
            onToggle={() => onToggle(entry.student_name)}
            onScoreToggle={() => onScoreToggle(entry.student_name)}
            onOpenMoveModal={() => onOpenMoveModal(entry.student_name)}
            moving={moving === entry.student_name}
          />
        ))}
      </div>
    </div>
  )
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function sortByComposite(entries: StudentEntry[]): StudentEntry[] {
  return [...entries].sort((a, b) => {
    if (a.composite === null && b.composite === null) return 0
    if (a.composite === null) return 1
    if (b.composite === null) return -1
    return b.composite - a.composite
  })
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClassAssignmentTab({ students: allStudents }: { students: StudentRow[] }) {
  const students = useMemo(
    () => allStudents.filter(s => !EXCLUDED_NAMES.has(s.student_name)),
    [allStudents],
  )

  const [selectionData, setSelectionData] = useState<ClassSelectionRow[]>([])
  const [overrideData, setOverrideData] = useState<ClassOverrideRow[]>([])
  const [quizResults, setQuizResults] = useState<Awaited<ReturnType<typeof getQuizResults>>>([])
  const [lectureRows, setLectureRows] = useState<Awaited<ReturnType<typeof getCh5Progress>>>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [scoreExpanded, setScoreExpanded] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [moveModalName, setMoveModalName] = useState<string | null>(null)
  const [unsubCollapsed, setUnsubCollapsed] = useState(false)
  const [resubCollapsed, setResubCollapsed] = useState(false)

  const overrideMap = useMemo(() => {
    const m = new Map<string, ClassOverrideRow>()
    for (const o of overrideData) m.set(o.student_name, o)
    return m
  }, [overrideData])

  const load = useCallback(async () => {
    setLoading(true)
    const [selection, overrides, quiz, lecture] = await Promise.all([
      getClassSelectionData(),
      getClassOverrides(),
      getQuizResults(),
      getCh5Progress(),
    ])
    setSelectionData(selection)
    setOverrideData(overrides)
    setQuizResults(quiz)
    setLectureRows(lecture)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // 티어 계산
  const tierMap = useMemo(() => {
    const result = new Map<string, {
      tier: TierKey; composite: number
      interestScore: number; quizScore: number; lectureScore: number
    }>()
    if (!quizResults.length) return result

    const quizMap = new Map(quizResults.map(r => [r.student_id, r]))
    const lectureMap = new Map(lectureRows.map(r => [r.student_id, r]))

    const rawInterests = students
      .filter(s => DATA_QS.some(q => s.answers[q] !== undefined))
      .map(s => Math.max(0, DATA_QS.reduce((sum, q) => {
        const k = s.answers[q]
        return sum + (k !== undefined ? (ANSWER_WEIGHTS[k] ?? 0) : 0)
      }, 0)) / DATA_Q_MAX * 100)
    const rawQuiz = quizResults.filter(r => r.total_score >= 0).map(r => r.total_score / 120 * 100)

    const avgInterest = rawInterests.length
      ? rawInterests.reduce((a, b) => a + b, 0) / rawInterests.length : 50
    const avgQuiz = rawQuiz.length
      ? rawQuiz.reduce((a, b) => a + b, 0) / rawQuiz.length : 50
    const penaltyInterest = Math.round(avgInterest * 0.75)
    const penaltyQuiz = Math.round(avgQuiz * 0.75)

    for (const s of students) {
      const qRow = quizMap.get(s.id) ?? null
      const quizMissing = !qRow || qRow.total_score < 0
      const quizScore = quizMissing ? penaltyQuiz : Math.round(qRow!.total_score / 120 * 100)
      const lRow = lectureMap.get(s.id)
      const lectureScore = lRow ? Math.round(lRow.avg_progress) : 0
      result.set(s.student_name, calcTierData(s.answers, quizScore, lectureScore, penaltyInterest))
    }
    return result
  }, [students, quizResults, lectureRows])

  // 최종 엔트리 목록
  const entries = useMemo((): StudentEntry[] =>
    selectionData.map(row => {
      const dbName = SHEET_TO_DB_NAME[row.student_name] ?? row.student_name
      const tierData = tierMap.get(dbName) ?? null
      const override = overrideMap.get(row.student_name) ?? null
      const isOverridden = override !== null
      const current_class = override?.assigned_class ?? row.chosen_class
      return {
        student_name: row.student_name,
        chosen_class: row.chosen_class,
        current_class,
        tier: tierData?.tier ?? null,
        composite: tierData?.composite ?? null,
        interest_score: tierData?.interestScore ?? null,
        quiz_score: tierData?.quizScore ?? null,
        lecture_score: tierData?.lectureScore ?? null,
        content_pref: row.content_pref,
        content_data_pref: row.content_data_pref,
        data_pref: row.data_pref,
        reason: row.reason,
        difficult_parts: row.difficult_parts,
        match_status: getMatchStatus(tierData?.tier ?? null, current_class),
        is_overridden: isOverridden,
        moved_by: override?.moved_by ?? null,
        move_reason: override?.move_reason ?? null,
        previous_chosen_class: row.previous_chosen_class,
        resubmit_count: row.resubmit_count ?? 1,
      }
    }),
  [selectionData, tierMap, overrideMap])

  // 미제출 인원: DB에 있지만 시트에 미제출
  const unsubmitted = useMemo((): UnsubmittedStudent[] => {
    const submittedDbNames = new Set(
      selectionData.map(r => SHEET_TO_DB_NAME[r.student_name] ?? r.student_name)
    )
    return students
      .filter(s => !submittedDbNames.has(s.student_name))
      .map(s => {
        const td = tierMap.get(s.student_name)
        return {
          student_name: s.student_name,
          tier: td?.tier ?? null,
          composite: td?.composite ?? null,
        }
      })
  }, [students, selectionData, tierMap])

  // 재제출 인원
  const resubmitters = useMemo(() =>
    entries.filter(e =>
      e.resubmit_count > 1 &&
      e.previous_chosen_class !== null &&
      e.previous_chosen_class !== e.chosen_class
    ),
  [entries])

  // 분반 이동 처리
  const handleMove = useCallback(async (targetClass: ClassType, movedBy: string, moveReason: string) => {
    if (!moveModalName) return
    const studentName = moveModalName
    setMoving(studentName)

    const entry = entries.find(e => e.student_name === studentName)
    let error: string | undefined

    if (entry && targetClass === entry.chosen_class) {
      // 원래 반으로 복원 — override 삭제
      const res = await deleteClassOverride(studentName)
      error = res.error
    } else {
      const res = await saveClassOverride(studentName, targetClass, movedBy, moveReason)
      error = res.error
    }

    if (!error) {
      await load()
    }
    setMoving(null)
    setMoveModalName(null)
  }, [moveModalName, entries, load])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    const result = await syncClassSelection()
    if (result.error) {
      setSyncMsg({ text: `오류: ${result.error}`, ok: false })
    } else {
      setSyncMsg({ text: `${result.synced}명 동기화 완료${result.skipped > 0 ? ` (중복 ${result.skipped}건 제거)` : ''}`, ok: true })
      await load()
    }
    setSyncing(false)
  }

  const toggleExpand = useCallback((name: string) => {
    setExpanded(prev => prev === name ? null : name)
    setScoreExpanded(null)
  }, [])

  const toggleScoreExpand = useCallback((name: string) => {
    setScoreExpanded(prev => prev === name ? null : name)
  }, [])

  // ── Summary stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = entries.length
    const matched = entries.filter(e => e.match_status === 'match').length
    const mismatch = entries.filter(e => e.match_status !== 'match' && e.match_status !== 'unknown').length
    const unknown = entries.filter(e => e.match_status === 'unknown').length
    return { total, matched, mismatch, unknown }
  }, [entries])

  const moveModalEntry = moveModalName ? entries.find(e => e.student_name === moveModalName) ?? null : null

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center text-slate-400 text-sm">
        데이터 불러오는 중...
      </div>
    )
  }

  if (selectionData.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-600 font-medium">시트 데이터가 없습니다.</p>
        <p className="text-xs text-slate-400">
          분반 선택 시트를 <strong>"링크 있는 사용자 보기 가능"</strong>으로 설정한 뒤 새로고침 버튼을 눌러주세요.
        </p>
        <button onClick={handleSync} disabled={syncing}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {syncing ? '동기화 중...' : '시트 새로고침'}
        </button>
        {syncMsg && (
          <p className={`text-xs ${syncMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{syncMsg.text}</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      {/* 이동 모달 */}
      {moveModalEntry && (
        <MoveModal
          entry={moveModalEntry}
          onConfirm={handleMove}
          onCancel={() => setMoveModalName(null)}
          saving={moving === moveModalName}
        />
      )}

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">분반 선택 현황</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            역량 탭 티어(상/중/하)와 선택 분반을 비교합니다. 이동 버튼으로 분반을 변경할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {syncMsg && (
            <span className={`text-xs ${syncMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {syncMsg.text}
            </span>
          )}
          <button onClick={handleSync} disabled={syncing}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
            {syncing ? '동기화 중...' : '시트 새로고침'}
          </button>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {([
          { label: '전체', value: stats.total, color: '#6366f1' },
          { label: '적합', value: stats.matched, color: '#10b981' },
          { label: '부적합', value: stats.mismatch, color: '#f59e0b' },
          { label: '역량 미확인', value: stats.unknown, color: '#94a3b8' },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mb-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />맞는 수강생</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />실력보다 낮은 반 선택</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />실력보다 높은 반 선택</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />역량 미확인</span>
        <span className="flex items-center gap-1 ml-1"><span className="w-3 h-3 rounded bg-slate-200 shrink-0 inline-block" />이동된 수강생</span>
      </div>

      {/* 재제출 알림 */}
      {resubmitters.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setResubCollapsed(v => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-semibold text-xs">재제출 변경 인원</span>
              <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
                {resubmitters.length}명
              </span>
            </div>
            <span className="text-amber-400 text-xs">{resubCollapsed ? '▼' : '▲'}</span>
          </button>
          {!resubCollapsed && (
            <div className="mt-2 space-y-1">
              {resubmitters.map(e => (
                <div key={e.student_name} className="flex items-center gap-2 text-[11px]">
                  <span className="font-medium text-slate-700 w-16 shrink-0">{e.student_name}</span>
                  <span style={{ color: CLASS_CFG[e.previous_chosen_class!].color }}>
                    {CLASS_CFG[e.previous_chosen_class!].label}
                  </span>
                  <span className="text-amber-400">→</span>
                  <span style={{ color: CLASS_CFG[e.chosen_class].color }}>
                    {CLASS_CFG[e.chosen_class].label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3열 레이아웃 */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {CLASS_TYPES.map(classType => {
          const cfg = CLASS_CFG[classType]
          const col = entries.filter(e => e.current_class === classType)
          const matchGroups = {
            match: sortByComposite(col.filter(e => e.match_status === 'match')),
            underplacing: sortByComposite(col.filter(e => e.match_status === 'underplacing')),
            overreaching: sortByComposite(col.filter(e => e.match_status === 'overreaching')),
            unknown: col.filter(e => e.match_status === 'unknown'),
          }

          return (
            <div key={classType} className="rounded-2xl border-2 border-transparent p-3">
              {/* 컬럼 헤더 */}
              <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: cfg.bg }}>
                <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: cfg.color + 'bb' }}>{cfg.tutors}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs font-bold" style={{ color: cfg.color }}>{col.length}명</span>
                  <span className="text-[10px]" style={{ color: cfg.color + 'aa' }}>
                    적합 {matchGroups.match.length} ·
                    부적합 {matchGroups.underplacing.length + matchGroups.overreaching.length}
                    {matchGroups.unknown.length > 0 ? ` · 미확인 ${matchGroups.unknown.length}` : ''}
                  </span>
                </div>
              </div>

              {/* 섹션들 */}
              <div className="space-y-4">
                <StudentSection
                  title="맞는 수강생"
                  indicator="#10b981"
                  entries={matchGroups.match}
                  expanded={expanded}
                  scoreExpanded={scoreExpanded}
                  onToggle={toggleExpand}
                  onScoreToggle={toggleScoreExpand}
                  onOpenMoveModal={setMoveModalName}
                  moving={moving}
                />

                {(matchGroups.underplacing.length > 0 || matchGroups.overreaching.length > 0) && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[11px] font-semibold text-slate-500">안 맞는 수강생</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {matchGroups.underplacing.length + matchGroups.overreaching.length}명
                      </span>
                    </div>
                    <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                      <StudentSection
                        title="실력보다 낮은 반 선택"
                        subtitle="역량 대비 쉬운 반"
                        indicator="#f59e0b"
                        entries={matchGroups.underplacing}
                        expanded={expanded}
                        scoreExpanded={scoreExpanded}
                        onToggle={toggleExpand}
                        onScoreToggle={toggleScoreExpand}
                        onOpenMoveModal={setMoveModalName}
                        moving={moving}
                      />
                      <StudentSection
                        title="실력보다 높은 반 선택"
                        subtitle="역량 대비 어려운 반"
                        indicator="#f43f5e"
                        entries={matchGroups.overreaching}
                        expanded={expanded}
                        scoreExpanded={scoreExpanded}
                        onToggle={toggleExpand}
                        onScoreToggle={toggleScoreExpand}
                        onOpenMoveModal={setMoveModalName}
                        moving={moving}
                      />
                    </div>
                  </div>
                )}

                <StudentSection
                  title="역량 미확인"
                  subtitle="체크리스트 또는 퀴즈 미제출"
                  indicator="#94a3b8"
                  entries={matchGroups.unknown}
                  expanded={expanded}
                  scoreExpanded={scoreExpanded}
                  onToggle={toggleExpand}
                  onScoreToggle={toggleScoreExpand}
                  onOpenMoveModal={setMoveModalName}
                  moving={moving}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* 미제출 인원 */}
      {unsubmitted.length > 0 && (
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setUnsubCollapsed(v => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold text-xs">분반 미제출 인원</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-medium">
                {unsubmitted.length}명
              </span>
              <span className="text-[10px] text-slate-400">구글 폼을 제출하지 않은 활성 수강생</span>
            </div>
            <span className="text-slate-400 text-xs">{unsubCollapsed ? '▼' : '▲'}</span>
          </button>
          {!unsubCollapsed && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {unsubmitted.map(s => {
                const tierCfg = s.tier ? TIER_CFG[s.tier] : null
                return (
                  <div key={s.student_name}
                    className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">{s.student_name}</span>
                    {tierCfg ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ color: tierCfg.color, backgroundColor: tierCfg.bg }}>
                        {tierCfg.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 shrink-0">미확인</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
