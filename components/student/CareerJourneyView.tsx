'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { JOB_LABELS_FLAT, type JobType } from '@/lib/survey-questions'
import { saveDay23, saveDay5, skipTutorComment1 } from '@/app/actions/checklist'
import {
  type Day1Data, type Day23Data, type Day5Data,
  EMPTY_DAY23, EMPTY_DAY5,
} from '@/lib/types'

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}

// 진행 단계 표시 (체크리스트~완료, 6단계)
const PROGRESS_STEPS = [
  '체크리스트',
  'DAY 1',
  '1차 면담',
  'DAY 2+3',
  '2차 면담',
  '최종 정리',
]

function StageProgress({ stage }: { stage: number }) {
  // stage 0~5 → steps 0~5 완료 기준
  // stage 1 = DAY1 완료, stage 2 = 1차 면담 완료, ...
  const completedUpTo = stage // 0=체크리스트완료, 1=DAY1완료, 2=1차면담완료, 3=DAY23완료, 4=2차면담완료, 5=최종완료
  return (
    <div className="flex items-center gap-0.5">
      {PROGRESS_STEPS.map((label, i) => {
        const done = i < completedUpTo
        const active = i === completedUpTo
        return (
          <div key={i} className="flex items-center">
            <div className={`flex items-center justify-center rounded-full text-[9px] font-bold
              ${done ? 'bg-emerald-500 text-white w-4 h-4' :
                active ? 'bg-slate-900 text-white w-4 h-4' :
                'bg-slate-200 text-slate-400 w-4 h-4'}`}>
              {done ? '✓' : i + 1}
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className={`w-3 h-0.5 ${i < completedUpTo ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
      <span className="ml-1.5 text-[10px] text-slate-400 hidden sm:inline">
        {PROGRESS_STEPS[Math.min(completedUpTo, PROGRESS_STEPS.length - 1)]}
      </span>
    </div>
  )
}

type Props = {
  stage: number
  studentName: string
  sessionRound: number
  topJob: JobType | null
  topJobPct: number
  day1Data: Day1Data
  day23Data: Day23Data
  day5Data: Day5Data
  tutorComment1: string | null
  tutorComment2: string | null
}

export default function CareerJourneyView({
  stage, studentName, sessionRound, topJob, topJobPct,
  day1Data, day23Data, day5Data, tutorComment1, tutorComment2,
}: Props) {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState(stage)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [showSlack2, setShowSlack2] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSkip = () => {
    startTransition(async () => {
      await skipTutorComment1(sessionRound)
      setCurrentStage(2)
      setShowSkipWarning(false)
    })
  }

  // ─── Stage 1: DAY1 완료, 1차 면담 대기 ────────────────────────
  if (currentStage === 1) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">{studentName}님</span>
            <StageProgress stage={1} />
            <span className="text-xs text-slate-400">1차 면담 대기</span>
          </div>
        </nav>

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">DAY 1 완료!</h2>
            <p className="text-sm text-slate-500 mb-2 leading-relaxed">
              튜터님께 슬랙으로 1차 면담을 요청해보세요.
            </p>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              튜터님이 피드백을 남기면 DAY 2+3이 열립니다.
            </p>

            {topJob && (
              <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                <p className="text-[11px] text-slate-400 mb-1">체크리스트 결과</p>
                <p className="text-base font-bold" style={{ color: JOB_COLORS[topJob] }}>
                  {JOB_LABELS_FLAT[topJob]} {topJobPct}%
                </p>
              </div>
            )}

            <button onClick={() => router.refresh()}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm mb-3">
              🔄 새로고침 (면담 완료 후)
            </button>
            <button onClick={() => setShowSkipWarning(true)}
              className="w-full text-xs text-slate-400 hover:text-slate-600 py-2 transition-colors">
              면담 없이 DAY 2+3 작성하기
            </button>
          </div>
        </div>

        {/* 건너뛰기 경고 모달 */}
        {showSkipWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowSkipWarning(false)} />
            <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-3xl text-center mb-3">⚠️</div>
              <h3 className="text-base font-bold text-slate-900 text-center mb-2">
                면담을 먼저 받는 것을 권장해요
              </h3>
              <p className="text-sm text-slate-500 text-center mb-5 leading-relaxed">
                튜터님의 피드백을 받고 DAY 2+3을 작성하면 훨씬 명확한 방향을 잡을 수 있어요. 정말 면담 없이 진행할까요?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowSkipWarning(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-sm">
                  취소
                </button>
                <button onClick={handleSkip} disabled={isPending}
                  className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {isPending ? '처리 중...' : '면담 없이 진행'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Stage 2: DAY2+3 폼 ──────────────────────────────────────
  if (currentStage === 2) {
    return (
      <Day23FormScreen
        studentName={studentName}
        sessionRound={sessionRound}
        topJob={topJob}
        initialData={{ ...EMPTY_DAY23, ...day23Data }}
        tutorComment={tutorComment1}
        onComplete={() => {
          setCurrentStage(3)
          setShowSlack2(true)
        }}
      />
    )
  }

  // ─── Stage 3: DAY2+3 완료, 2차 면담 대기 ─────────────────────
  if (currentStage === 3) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">{studentName}님</span>
            <StageProgress stage={3} />
            <span className="text-xs text-slate-400">2차 면담 대기</span>
          </div>
        </nav>

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">DAY 2+3 완료!</h2>
            <p className="text-sm text-slate-500 mb-3 leading-relaxed">
              튜터님께 슬랙으로 2차 면담을 요청하세요.
            </p>
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-orange-700 leading-relaxed">
                🔒 2차 면담은 필수예요. 튜터님의 피드백을 받아야 최종 정리(DAY 5)가 열립니다.
              </p>
            </div>
            <button onClick={() => router.refresh()}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm">
              🔄 새로고침 (면담 완료 후)
            </button>
          </div>
        </div>

        {/* 2차 면담 슬랙 초안 오버레이 */}
        {showSlack2 && (
          <SlackScreen2
            studentName={studentName}
            topJob={topJob}
            onClose={() => setShowSlack2(false)}
          />
        )}
      </div>
    )
  }

  // ─── Stage 4: DAY5 최종 폼 ───────────────────────────────────
  if (currentStage === 4) {
    return (
      <Day5FormScreen
        studentName={studentName}
        sessionRound={sessionRound}
        initialData={{ ...EMPTY_DAY5, ...day5Data }}
        tutorComment={tutorComment2}
        onComplete={() => setCurrentStage(5)}
      />
    )
  }

  // ─── Stage 5: 모든 과정 완료 ──────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-center">
          <StageProgress stage={5} />
        </div>
      </nav>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-5">🎉</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">모든 과정 완료!</h2>
        <p className="text-sm text-slate-500 mb-2 leading-relaxed">
          DAY 1 → 2+3 → 최종 정리까지 모두 완성했어요.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed">
          세션에서 더욱 풍부한 활동을 할 수 있을 거예요 💪
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DAY 2+3 폼
// ══════════════════════════════════════════════════════════════════

const DAY23_TABS = [
  { key: 'day2', label: '🔍 나는 어떤 마케터인가' },
  { key: 'day3', label: '🧭 나의 취업 방향' },
] as const

type Day23Tab = typeof DAY23_TABS[number]['key']
type SetDay23Fn = (key: keyof Day23Data) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void

function Day23FormScreen({ studentName, sessionRound, topJob, initialData, tutorComment, onComplete }: {
  studentName: string
  sessionRound: number
  topJob: JobType | null
  initialData: Day23Data
  tutorComment: string | null
  onComplete: () => void
}) {
  const [data, setData] = useState<Day23Data>(initialData)
  const [tab, setTab] = useState<Day23Tab>('day2')
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const set: SetDay23Fn = (key) => (e) =>
    setData(prev => ({ ...prev, [key]: e.target.value }))

  const tabIndex = DAY23_TABS.findIndex(t => t.key === tab)
  const isLastTab = tabIndex === DAY23_TABS.length - 1

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDay23(sessionRound, data)
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10 shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-slate-500">{studentName}님</span>
          <StageProgress stage={2} />
          <span className="text-xs text-slate-400" />
        </div>
      </nav>

      <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">DAY 2+3</span>
          <h2 className="text-sm font-bold text-slate-900">나는 어떤 마케터인가? + 취업 방향</h2>
        </div>
        {topJob && (
          <p className="text-xs text-slate-400">
            체크리스트 결과: <span className="font-semibold" style={{ color: JOB_COLORS[topJob] }}>{JOB_LABELS_FLAT[topJob]}</span> 적합도 참고해서 작성해보세요
          </p>
        )}
      </div>

      {/* 튜터 코멘트 배너 */}
      {tutorComment && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 shrink-0">
          <p className="text-xs font-semibold text-emerald-700 mb-1">💬 튜터님 피드백</p>
          <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{tutorComment}</p>
        </div>
      )}

      {/* 탭 */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-0 shrink-0">
        {DAY23_TABS.map((t, i) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
            {i < tabIndex && <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 ml-1 mb-0.5" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {tab === 'day2' && <Day2Tab data={data} set={set} topJob={topJob} />}
          {tab === 'day3' && <Day3Tab data={data} set={set} />}
        </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <div className="flex gap-2">
            {!isLastTab ? (
              <>
                <button onClick={() => setTab(DAY23_TABS[tabIndex + 1].key)}
                  className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm">
                  다음 →
                </button>
                <button onClick={handleSave} disabled={isPending}
                  className="px-4 bg-slate-100 text-slate-600 font-medium py-2.5 rounded-xl text-sm disabled:opacity-50 whitespace-nowrap">
                  {isPending ? '저장 중...' : '바로 저장'}
                </button>
              </>
            ) : (
              <button onClick={handleSave} disabled={isPending}
                className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {isPending ? '저장 중...' : '💾 저장하고 면담 요청하기'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-slate-800 mb-1">{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 mb-2 leading-relaxed">{children}</p>
}
function Area({ value, onChange, placeholder, rows = 4 }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
  )
}

function Day2Tab({ data, set, topJob }: { data: Day23Data; set: SetDay23Fn; topJob: JobType | null }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
        DAY 1에서 꺼낸 경험을 바탕으로 <strong>어떤 마케터가 되고 싶은지</strong> 윤곽을 잡아보세요.
        {topJob && ` 체크리스트 결과(${JOB_LABELS_FLAT[topJob]})도 참고해보세요.`}
      </div>
      <div>
        <Label>📚 커리큘럼 중 흥미로웠던 것</Label>
        <Hint>배운 것들 중 흥미로웠던 것, 잘했던 것, 별로였던 것을 자유롭게 적어보세요. 솔직하게!</Hint>
        <Area value={data.curriculum_notes} onChange={set('curriculum_notes')} rows={5}
          placeholder={`흥미로웠던 영역: (광고 기획, AI 콘텐츠, 퍼포먼스 마케팅, 데이터 분석 등)\n잘했다/할 수 있겠다 싶은 것:\n별로였던 것 + 이유:`} />
      </div>
      <div>
        <Label>🎯 나의 업무 스타일</Label>
        <Hint>아래 중 나는 어디에 가까운가요? 솔직하게 점수(1~5)나 설명으로 적어보세요.</Hint>
        <Area value={data.work_style} onChange={set('work_style')} rows={5}
          placeholder={`숫자·분석 ←→ 기획·크리에이티브 (1~5): \n빠른 실행 ←→ 깊이 있는 사고 (1~5): \n혼자 집중 ←→ 협업·소통 (1~5): \n즉각 성과 ←→ 장기 전략 (1~5):`} />
      </div>
      <div>
        <Label>💪 나의 강점 3가지</Label>
        <Hint>「나는 __을 잘한다, 왜냐하면 __한 경험이 있기 때문이다」 형식으로 써보세요.</Hint>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 mb-2">
          예: 「나는 감정을 건드리는 글을 잘 쓴다, 왜냐하면 콘텐츠 프로젝트에서 내 카피를 팀원들이 가장 많이 선택했기 때문이다」
        </div>
        <Area value={data.strengths} onChange={set('strengths')} rows={6}
          placeholder={`강점 1: 나는 __ 을 잘한다, 왜냐하면...\n\n강점 2: 나는 __ 을 잘한다, 왜냐하면...\n\n강점 3: 나는 __ 을 잘한다, 왜냐하면...`} />
      </div>
      <div>
        <Label>✍️ 한 문장 완성</Label>
        <Hint>아직 완벽하지 않아도 됩니다. 지금 이 순간의 나를 써보세요.</Hint>
        <Area value={data.marketer_sentence} onChange={set('marketer_sentence')} rows={3}
          placeholder={`나는 ___한 마케터가 되고 싶다.\n왜냐하면 나는 ___할 때 가장 살아있다고 느끼기 때문이다.`} />
      </div>
    </div>
  )
}

function Day3Tab({ data, set }: { data: Day23Data; set: SetDay23Fn }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
        DAY 2에서 파악한 나의 스타일과 강점을 바탕으로 <strong>어디로 갈지</strong> 방향을 잡아보세요.
      </div>
      <div>
        <Label>🥇 1순위 목표 직무 & 이유</Label>
        <Hint>퍼포먼스 / 콘텐츠 / 브랜드 / 그로스 / CRM / AE 중 하나. DAY 2 강점과 연결해서 이유를 써주세요.</Hint>
        <Area value={data.target_job_1} onChange={set('target_job_1')} rows={3}
          placeholder={`직무명: ___\n이유: 나는 ___ 때문에 이 직무가 맞다고 생각합니다`} />
      </div>
      <div>
        <Label>🥈 2순위 목표 직무 & 이유 <span className="font-normal text-slate-400">(선택)</span></Label>
        <Area value={data.target_job_2} onChange={set('target_job_2')} rows={2}
          placeholder="직무명 + 한 줄 이유 (없으면 비워도 됩니다)" />
      </div>
      <div>
        <Label>🏭 관심 산업 Top 3</Label>
        <Hint>IT/SaaS · 이커머스 · 뷰티 · 식음료 · 패션 · 교육 · 헬스케어 · 게임 · 콘텐츠 · 금융 등</Hint>
        <Area value={data.industries} onChange={set('industries')} rows={4}
          placeholder={`1순위: (산업명) / 이유:\n2순위: (산업명) / 이유:\n3순위: (산업명) / 이유:`} />
      </div>
      <div>
        <Label>🏢 일하고 싶은 환경</Label>
        <Area value={data.work_environment} onChange={set('work_environment')} rows={3}
          placeholder={`대행사 vs 인하우스: ___\n선호 회사 규모: 스타트업 / 중소 / 중견·대기업\n이유:`} />
      </div>
      <div>
        <Label>📄 목표 JD 링크</Label>
        <Hint>원티드·사람인에서 「이런 곳에서 일하고 싶다」는 느낌의 공고 하나를 찾아보세요.</Hint>
        <input value={data.target_jd_url} onChange={set('target_jd_url')}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-2"
          placeholder="https://..." />
        <Area value={data.target_jd_note} onChange={set('target_jd_note')} rows={4}
          placeholder={`이 JD를 고른 이유:\n할 수 있을 것 같은 부분:\n아직 부족한 부분:`} />
      </div>
      <div>
        <Label>🧭 나의 취업 나침반 초안</Label>
        <Hint>지금까지 3일간 쓴 내용을 압축해 보세요.</Hint>
        <Area value={data.compass_draft} onChange={set('compass_draft')} rows={4}
          placeholder={`나는 (직무) 마케터로서\n(산업 / 회사 유형)에 지원하겠다.\n나의 강점은 (강점)이고,\n그 근거가 되는 경험은 (경험)이다.`} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// 2차 면담 슬랙 초안
// ══════════════════════════════════════════════════════════════════

function SlackScreen2({ studentName, topJob, onClose }: {
  studentName: string
  topJob: JobType | null
  onClose: () => void
}) {
  const jobName = topJob ? JOB_LABELS_FLAT[topJob] : '마케터'
  const [copied, setCopied] = useState(false)

  const draft = `OO튜터님 안녕하세요, ${studentName}입니다 :)

DAY 2+3 경험 정리를 완성했어요. 목표 직무와 취업 방향을 구체화해봤는데요,

2차 면담을 통해 방향을 확인하고 피드백을 받고 싶습니다. [지금 / __시에] 잠깐 시간 괜찮으실까요? 10~15분 정도 부탁드려요 :)

* ${jobName} 방향으로 정리했어요`

  const handleCopy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900 mb-0.5">💬 2차 면담 슬랙 초안</h2>
        <p className="text-xs text-slate-400 mb-4">「OO」와 「[지금/__시에]」 부분을 수정한 후 복사하세요</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{draft}</pre>
        </div>

        <button onClick={handleCopy}
          className={`w-full font-semibold py-3 rounded-xl text-sm transition-all mb-2 ${
            copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}>
          {copied ? '✓ 복사됐어요!' : '📋 슬랙 초안 복사하기'}
        </button>

        <button onClick={onClose}
          className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          완료 (면담 대기 화면으로)
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DAY 5 최종 정리 폼
// ══════════════════════════════════════════════════════════════════

const PRE_CHECKLIST_ITEMS = [
  '목표 직무를 1순위로 결정했다',
  '목표 JD를 1개 찾아 링크를 저장해뒀다',
  '내 경험 목록이 정리되어 있다 (캠프 전·후 모두)',
  '나의 강점 3가지를 경험 근거와 함께 쓸 수 있다',
  '나의 취업 나침반 한 장이 완성됐다',
]

function Day5FormScreen({ studentName, sessionRound, initialData, tutorComment, onComplete }: {
  studentName: string
  sessionRound: number
  initialData: Day5Data
  tutorComment: string | null
  onComplete: () => void
}) {
  const [data, setData] = useState<Day5Data>(initialData)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const setField = (key: keyof Omit<Day5Data, 'pre_checklist'>) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setData(prev => ({ ...prev, [key]: e.target.value }))

  const toggleCheck = (item: string) =>
    setData(prev => ({
      ...prev,
      pre_checklist: {
        ...prev.pre_checklist,
        [item]: !prev.pre_checklist[item],
      },
    }))

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDay5(sessionRound, data)
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10 shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-slate-500">{studentName}님</span>
          <StageProgress stage={4} />
          <span className="text-xs text-slate-400" />
        </div>
      </nav>

      <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-white bg-purple-600 px-2 py-0.5 rounded-full">DAY 5</span>
          <h2 className="text-sm font-bold text-slate-900">나의 취업 나침반 완성</h2>
        </div>
        <p className="text-xs text-slate-400">DAY 1~3에서 쓴 내용을 바탕으로 한 장으로 압축해보세요. (약 1시간)</p>
      </div>

      {/* 튜터 코멘트 배너 */}
      {tutorComment && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 shrink-0">
          <p className="text-xs font-semibold text-emerald-700 mb-1">💬 튜터님 피드백</p>
          <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{tutorComment}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

          {/* 파트 1: 나의 취업 나침반 완성 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">파트 1 | 나의 취업 나침반 완성 <span className="text-xs font-normal text-slate-400">(40분)</span></p>
              <p className="text-xs text-slate-400 mt-0.5">DAY 1~3에서 쓴 내용을 아래에 옮겨 채워주세요</p>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <Label>🙋 나는 어떤 사람인가</Label>
                <Area value={data.compass_who} onChange={setField('compass_who')} rows={6}
                  placeholder={`핵심 경험 3가지 (캠프 전·후 통틀어):\n\n나의 강점 3가지 (근거 포함):\n\n에너지가 올라가는 일:\n\n피하고 싶은 일 + 이유:`} />
              </div>
              <div>
                <Label>🎯 나는 어디로 가는가</Label>
                <Area value={data.compass_where} onChange={setField('compass_where')} rows={6}
                  placeholder={`목표 직무 (1순위 / 2순위):\n\n대행사 vs 인하우스:\n\n선호 회사 규모:\n\n관심 산업:\n\n목표 JD 링크:`} />
              </div>
              <div>
                <Label>💬 나는 왜 이 방향인가</Label>
                <Hint>나는 (직무) 마케터로서 (환경)에서 일하고 싶다. 나의 (강점/경험)이 이 방향과 맞닿아 있기 때문이다.</Hint>
                <Area value={data.compass_why} onChange={setField('compass_why')} rows={4}
                  placeholder="나는 ___ 마케터로서 ___ 에서 일하고 싶다.&#10;나의 ___ 이 이 방향과 맞닿아 있기 때문이다." />
              </div>
            </div>
          </div>

          {/* 파트 2: 세션 전 체크리스트 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">파트 2 | 세션 전 체크리스트 <span className="text-xs font-normal text-slate-400">(20분)</span></p>
            </div>
            <div className="p-5 space-y-3">
              {PRE_CHECKLIST_ITEMS.map(item => (
                <label key={item} className="flex items-start gap-3 cursor-pointer group">
                  <div onClick={() => toggleCheck(item)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      data.pre_checklist[item]
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300 group-hover:border-slate-400'
                    }`}>
                    {data.pre_checklist[item] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm leading-relaxed ${
                    data.pre_checklist[item] ? 'text-emerald-700 line-through' : 'text-slate-700'
                  }`}>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 파트 3: 앞으로의 노력 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">파트 3 | 앞으로 어떤 노력을 할 건가</p>
              <p className="text-xs text-slate-400 mt-0.5">자유롭게 적어보세요. 순서나 우선순위를 매겨보고 튜터와 논의해봐요.</p>
            </div>
            <div className="p-5">
              <Area value={data.future_efforts} onChange={setField('future_efforts')} rows={7}
                placeholder="앞으로 해야 할 것들을 자유롭게 적어보세요..." />
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <button onClick={handleSave} disabled={isPending}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
            {isPending ? '저장 중...' : '🎉 완성! 저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
