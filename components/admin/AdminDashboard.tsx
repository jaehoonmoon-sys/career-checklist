'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { JOB_LABELS_FLAT, type JobType } from '@/lib/survey-questions'
import type { StudentRow } from '@/app/actions/admin'
import type { FormConfig } from '@/lib/form-config'
import { setDayGlobalAccess } from '@/app/actions/admin'
import StudentDetailModal from './StudentDetailModal'
import FormConfigTab from './FormConfigTab'

type FilterType = 'all' | 'incomplete' | JobType

const JOB_ORDER: JobType[] = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}

const JOB_EMOJIS: Record<JobType, string> = {
  performance: '⚡', content: '✍️', brand: '🎨',
  growth: '📈', crm: '👥', ae: '🤝',
}

const SHORT_LABELS: Record<JobType, string> = {
  performance: '퍼포먼스', content: '콘텐츠', brand: '브랜드',
  growth: '그로스', crm: 'CRM', ae: 'AE',
}

export default function AdminDashboard({
  students,
  formConfig,
}: {
  students: StudentRow[]
  formConfig: FormConfig
}) {
  const [mainTab, setMainTab] = useState<'students' | 'form'>('students')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null)
  const [search, setSearch] = useState('')

  const completed = useMemo(() => students.filter(s => s.completed), [students])
  const incomplete = useMemo(() => students.filter(s => !s.completed), [students])

  const jobCounts = useMemo(() =>
    JOB_ORDER.reduce((acc, job) => ({
      ...acc,
      [job]: completed.filter(s => s.top_job === job).length,
    }), {} as Record<JobType, number>),
  [completed])

  const filtered = useMemo(() => {
    let base: StudentRow[]
    if (filter === 'all') base = students
    else if (filter === 'incomplete') base = incomplete
    else base = completed.filter(s => s.top_job === filter)

    if (search.trim()) {
      base = base.filter(s => s.student_name.includes(search.trim()))
    }

    if (filter === 'all') {
      const comp = [...base.filter(s => s.completed)].sort((a, b) =>
        a.student_name.localeCompare(b.student_name))
      const incomp = [...base.filter(s => !s.completed)].sort((a, b) =>
        a.student_name.localeCompare(b.student_name))
      return [...comp, ...incomp]
    }

    if (filter === 'incomplete') {
      return [...base].sort((a, b) => a.student_name.localeCompare(b.student_name))
    }

    // 직무 필터: 해당 직무 % 높은 순
    return [...base].sort((a, b) => (b.job_pcts[filter] ?? 0) - (a.job_pcts[filter] ?? 0))
  }, [filter, students, completed, incomplete, search])

  const completionPct = students.length > 0
    ? Math.round((completed.length / students.length) * 100)
    : 0

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [stageConfirm, setStageConfirm] = useState<{
    day: '23' | '5'
    action: 'open' | 'close'
    step: 1 | 2
  } | null>(null)

  const day23Open = formConfig.day23_globally_open
  const day5Open = formConfig.day5_globally_open

  const handleGlobalStageChange = (day: '23' | '5', action: 'open' | 'close') => {
    startTransition(async () => {
      const result = await setDayGlobalAccess(day, action === 'open')
      if (result.success) {
        setStageConfirm(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 네비 */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← 로그아웃</a>
          <h1 className="text-base font-bold text-slate-900">관리자</h1>
          <span className="text-xs text-slate-400">관리자 모드</span>
        </div>
        {/* 상단 탭 */}
        <div className="max-w-7xl mx-auto px-4 pb-0 flex gap-1 border-t border-slate-50">
          {([
            { key: 'students', label: '수강생 현황' },
            { key: 'form',     label: '폼 설정' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                mainTab === tab.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 폼 설정 탭 */}
      {mainTab === 'form' && (
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 mb-0.5">폼 설정</h2>
            <p className="text-xs text-slate-500">수강생에게 표시되는 질문과 안내 문구를 수정합니다. 저장하면 즉시 모든 수강생에게 반영됩니다.</p>
          </div>
          <FormConfigTab initialConfig={formConfig} />
        </div>
      )}

      {/* 수강생 현황 탭 */}
      {mainTab === 'students' && (
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

        {/* 단계 접근 제어 */}
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <p className="text-sm font-semibold text-amber-700 mb-3">🔑 단계 접근 제어</p>

          {stageConfirm ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {stageConfirm.step === 1 ? '확인 1/2' : '확인 2/2 — 마지막 확인'}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {stageConfirm.action === 'open'
                  ? `DAY ${stageConfirm.day === '23' ? '2+3' : '5'} — 모든 수강생에게 열겠습니까?`
                  : `DAY ${stageConfirm.day === '23' ? '2+3' : '5'} — 모든 수강생의 접근을 닫겠습니까?`
                }
              </p>
              {stageConfirm.step === 2 && (
                <p className="text-xs text-slate-500">
                  {stageConfirm.action === 'open'
                    ? `전체 수강생 ${students.length}명에게 즉시 DAY ${stageConfirm.day === '23' ? '2+3' : '5'}이 열립니다.`
                    : `전체 수강생 ${students.length}명의 DAY ${stageConfirm.day === '23' ? '2+3' : '5'} 접근이 즉시 차단됩니다.`
                  }
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStageConfirm(null)}
                  className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50">
                  취소
                </button>
                <button
                  onClick={() => {
                    if (stageConfirm.step === 1) {
                      setStageConfirm({ ...stageConfirm, step: 2 })
                    } else {
                      handleGlobalStageChange(stageConfirm.day, stageConfirm.action)
                    }
                  }}
                  disabled={isPending}
                  className={`flex-1 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors ${
                    stageConfirm.action === 'open' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'
                  }`}>
                  {stageConfirm.step === 1 ? '예, 계속하기 →' : (stageConfirm.action === 'open' ? '예, 전체 열기' : '예, 전체 닫기')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* DAY 2+3 제어 */}
              <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">DAY 2+3</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    day23Open ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {day23Open ? '🔓 열림' : '🔒 잠금'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setStageConfirm({ day: '23', action: 'open', step: 1 })}
                    disabled={day23Open}
                    className="flex-1 border-2 border-blue-200 text-blue-700 text-xs font-semibold py-2 rounded-lg hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    전체 열기
                  </button>
                  <button
                    onClick={() => setStageConfirm({ day: '23', action: 'close', step: 1 })}
                    disabled={!day23Open}
                    className="flex-1 border-2 border-amber-200 text-amber-700 text-xs font-semibold py-2 rounded-lg hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    전체 닫기
                  </button>
                </div>
              </div>
              {/* DAY 5 제어 */}
              <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">DAY 5</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    day5Open ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {day5Open ? '🔓 열림' : '🔒 잠금'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setStageConfirm({ day: '5', action: 'open', step: 1 })}
                    disabled={day5Open}
                    className="flex-1 border-2 border-blue-200 text-blue-700 text-xs font-semibold py-2 rounded-lg hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    전체 열기
                  </button>
                  <button
                    onClick={() => setStageConfirm({ day: '5', action: 'close', step: 1 })}
                    disabled={!day5Open}
                    className="flex-1 border-2 border-amber-200 text-amber-700 text-xs font-semibold py-2 rounded-lg hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    전체 닫기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{students.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">전체 수강생</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">완료 ({completionPct}%)</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-400">{incomplete.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">미완료</p>
          </div>
        </div>

        {/* 직무별 분포 미니 바 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">완료 수강생 직무 분포</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {JOB_ORDER.map(job => {
              const count = jobCounts[job]
              const pct = completed.length > 0 ? Math.round(count / completed.length * 100) : 0
              return (
                <div key={job} className="text-center">
                  <div className="text-lg mb-1">{JOB_EMOJIS[job]}</div>
                  <div className="text-xl font-bold" style={{ color: JOB_COLORS[job] }}>{count}</div>
                  <div className="text-[11px] text-slate-500">{SHORT_LABELS[job]}</div>
                  <div className="text-[10px] text-slate-400">{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름으로 검색..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pl-9"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
              ✕
            </button>
          )}
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 flex-wrap">
          <FilterChip
            label={`전체 ${students.length}`}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color="#64748b"
          />
          {JOB_ORDER.map(job => (
            <FilterChip
              key={job}
              label={`${JOB_EMOJIS[job]} ${SHORT_LABELS[job]} ${jobCounts[job]}`}
              active={filter === job}
              onClick={() => setFilter(job)}
              color={JOB_COLORS[job]}
            />
          ))}
          <FilterChip
            label={`미완료 ${incomplete.length}`}
            active={filter === 'incomplete'}
            onClick={() => setFilter('incomplete')}
            color="#94a3b8"
          />
        </div>

        {/* 수강생 카드 그리드 */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                onClick={student.completed ? () => setSelectedStudent(student) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">해당하는 수강생이 없습니다</p>
          </div>
        )}
      </div>
      )}

      {/* 상세 모달 */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick, color }: {
  label: string
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
        active
          ? 'text-white border-transparent shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
      style={active ? { backgroundColor: color, borderColor: color } : {}}
    >
      {label}
    </button>
  )
}

const STAGE_BADGE: Record<number, { label: string; color: string }> = {
  1: { label: 'DAY1 완료 ⏳', color: '#f97316' },
  2: { label: 'DAY2+3 진행', color: '#3b82f6' },
  3: { label: 'DAY2+3 완료 ⏳', color: '#f97316' },
  4: { label: '최종 정리 중', color: '#8b5cf6' },
  5: { label: '전체 완료 ✅', color: '#10b981' },
}

function StudentCard({ student, onClick }: {
  student: StudentRow
  onClick?: () => void
}) {
  const { student_name, completed, top_job, job_pcts, answered_count, cohort, stage, answers } = student
  const stageBadge = (stage ?? 0) > 0 ? STAGE_BADGE[stage ?? 0] : null

  const preIdx = answers['_pre']
  const preSelectedJob: JobType | null =
    typeof preIdx === 'number' && preIdx >= 0 && preIdx < JOB_ORDER.length
      ? JOB_ORDER[preIdx]
      : null

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 transition-all ${
        completed
          ? 'border-slate-100 hover:shadow-md hover:border-slate-200 cursor-pointer active:scale-[0.98]'
          : 'border-slate-100 opacity-55'
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{student_name}</p>
        <span className="shrink-0 text-[10px] text-slate-400">{cohort}</span>
      </div>

      {stageBadge && (
        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full border mb-2"
          style={{ color: stageBadge.color, borderColor: `${stageBadge.color}50`, backgroundColor: `${stageBadge.color}10` }}>
          {stageBadge.label}
        </span>
      )}

      {completed && top_job ? (
        <>
          <span
            className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full text-white mb-1"
            style={{ backgroundColor: JOB_COLORS[top_job] }}
          >
            {JOB_EMOJIS[top_job]} {JOB_LABELS_FLAT[top_job]}
          </span>

          {preSelectedJob ? (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[10px] text-slate-400">💡</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: JOB_COLORS[preSelectedJob] }}>
                {SHORT_LABELS[preSelectedJob]}
              </span>
              {preSelectedJob === top_job
                ? <span className="text-[9px] text-emerald-500 font-medium">일치</span>
                : <span className="text-[9px] text-amber-500 font-medium">다름</span>
              }
            </div>
          ) : (
            <div className="mb-2" />
          )}

          {/* 상위 3개 직무 미니 바 */}
          <div className="space-y-1.5">
            {JOB_ORDER
              .map(job => ({ job, pct: job_pcts[job] }))
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 3)
              .map(({ job, pct }) => (
                <div key={job}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] text-slate-500">{SHORT_LABELS[job]}</span>
                    <span className="text-[10px] text-slate-400">{pct}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: JOB_COLORS[job] }} />
                  </div>
                </div>
              ))}
          </div>

          <p className="text-[10px] text-slate-400 mt-2.5">{answered_count}/30 답변</p>
        </>
      ) : (
        <div className="space-y-1.5">
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
            미완료
          </span>
          <p className="text-[10px] text-slate-400">아직 체크리스트 미제출</p>
        </div>
      )}
    </div>
  )
}
