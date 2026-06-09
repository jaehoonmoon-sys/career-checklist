'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { JOB_LABELS_FLAT, type JobType } from '@/lib/survey-questions'
import { saveDay1 } from '@/app/actions/checklist'
import { type Day1Data, EMPTY_DAY1 } from '@/lib/types'

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}

type Props = {
  studentName: string
  topJob: JobType | null
  topJobPct: number
  sessionRound: number
  initialDay1: Day1Data
  onClose: () => void
}

export default function PostSaveFlow(props: Props) {
  const [step, setStep] = useState<'choice' | 'day1' | 'slack'>('choice')
  const [fromDay1, setFromDay1] = useState(false)

  if (step === 'choice') {
    return (
      <ChoiceScreen
        topJob={props.topJob}
        topJobPct={props.topJobPct}
        onDirectSlack={() => setStep('slack')}
        onDay1={() => setStep('day1')}
        onClose={props.onClose}
      />
    )
  }

  if (step === 'day1') {
    return (
      <Day1FormScreen
        topJob={props.topJob}
        sessionRound={props.sessionRound}
        initialDay1={props.initialDay1}
        onComplete={() => { setFromDay1(true); setStep('slack') }}
        onClose={props.onClose}
      />
    )
  }

  return (
    <SlackScreen1
      studentName={props.studentName}
      topJob={props.topJob}
      topJobPct={props.topJobPct}
      fromDay1={fromDay1}
      onClose={props.onClose}
    />
  )
}

// ── 선택지 화면 ──────────────────────────────────────────────────

function ChoiceScreen({ topJob, topJobPct, onDirectSlack, onDay1, onClose }: {
  topJob: JobType | null
  topJobPct: number
  onDirectSlack: () => void
  onDay1: () => void
  onClose: () => void
}) {
  const color = topJob ? JOB_COLORS[topJob] : '#64748b'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">체크리스트 저장 완료!</h2>
          {topJob && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: `${color}14` }}>
              <span className="font-bold" style={{ color }}>{JOB_LABELS_FLAT[topJob]}</span>
              <span className="text-sm font-medium" style={{ color }}>{topJobPct}% 적합도</span>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500 text-center mb-4">다음 단계를 선택해주세요</p>

        <div className="space-y-3">
          <button onClick={onDirectSlack}
            className="w-full bg-slate-900 text-white rounded-2xl p-4 text-left hover:bg-slate-800 transition-colors active:scale-[0.98]">
            <div className="font-semibold text-base mb-0.5">💬 이대로 면담하러 가기</div>
            <div className="text-xs text-slate-400">슬랙 초안을 바로 복사해서 튜터에게 보내기</div>
          </button>
          <button onClick={onDay1}
            className="w-full border-2 border-slate-200 text-slate-700 rounded-2xl p-4 text-left hover:border-slate-300 hover:bg-slate-50 transition-colors active:scale-[0.98]">
            <div className="font-semibold text-base mb-0.5">📝 나의 경험 정리하고 면담하기</div>
            <div className="text-xs text-slate-500">DAY 1 경험 정리 후 더 풍부한 면담 가능</div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DAY 1 폼 ─────────────────────────────────────────────────────

const DAY1_TABS = [
  { key: 'exp',    label: '🗂️ 나의 경험' },
  { key: 'energy', label: '⚡ 에너지 체크' },
  { key: 'find',   label: '✅ 오늘의 발견' },
] as const

type Day1Tab = typeof DAY1_TABS[number]['key']
type SetFn = (key: keyof Day1Data) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void

function Day1FormScreen({ topJob, sessionRound, initialDay1, onComplete, onClose }: {
  topJob: JobType | null
  sessionRound: number
  initialDay1: Day1Data
  onComplete: () => void
  onClose: () => void
}) {
  const [data, setData] = useState<Day1Data>({ ...EMPTY_DAY1, ...initialDay1 })
  const [tab, setTab] = useState<Day1Tab>('exp')
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const set: SetFn = (key) => (e) =>
    setData(prev => ({ ...prev, [key]: e.target.value }))

  const tabIndex = DAY1_TABS.findIndex(t => t.key === tab)
  const isLastTab = tabIndex === DAY1_TABS.length - 1

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDay1(sessionRound, data)
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded-full">DAY 1</span>
          <h2 className="text-sm font-bold text-slate-900">나의 경험 꺼내기</h2>
        </div>
        <button onClick={onClose}
          className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          ✕
        </button>
      </div>

      {/* 안내 배너 */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 shrink-0">
        <p className="text-xs text-blue-700 leading-relaxed">
          💡 마케팅 경험이 없어도 괜찮아요. 올리브영 알바, 인스타 운영, 팀 프로젝트 — <strong>일단 다 꺼내세요.</strong> 선별은 나중에 합니다.
          {topJob && (
            <span className="ml-1">체크리스트 결과 <strong>{JOB_LABELS_FLAT[topJob]}</strong> 적합도가 가장 높았어요.</span>
          )}
        </p>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-0 shrink-0">
        {DAY1_TABS.map((t, i) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
            {/* 입력됐으면 점 표시 */}
            {i < tabIndex && <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 ml-1 mb-0.5" />}
          </button>
        ))}
      </div>

      {/* 폼 내용 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {tab === 'exp' && <ExpTab data={data} set={set} />}
          {tab === 'energy' && <EnergyTab data={data} set={set} />}
          {tab === 'find' && <FindTab data={data} set={set} />}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <div className="flex gap-2">
            {!isLastTab ? (
              <>
                <button onClick={() => setTab(DAY1_TABS[tabIndex + 1].key)}
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

// ── 탭별 섹션 ──────────────────────────────────────────────────────

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

function ExpTab({ data, set }: { data: Day1Data; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>💼 일 / 알바 / 직장 경험</Label>
        <Hint>마케팅과 관련 없어도 됩니다. 예: 카페 알바 → 고객 응대, 단골 파악 / 올리브영 → 제품 추천, 진열</Hint>
        <Area value={data.work} onChange={set('work')} placeholder="어떤 일을 했나요?" />
      </div>
      <div>
        <Label>🎓 학교 / 학습 경험</Label>
        <Hint>전공, 동아리, 학생회, 팀 프로젝트 등. 예: 학보사 기자, 축제 홍보 기획, 경영 수업 케이스 분석</Hint>
        <Area value={data.school} onChange={set('school')} placeholder="어떤 활동을 했나요?" />
      </div>
      <div>
        <Label>🌱 개인 활동</Label>
        <Hint>SNS, 블로그, 취미 등. 예: 인스타 운영, 브랜드 덕질, 여행</Hint>
        <Area value={data.personal} onChange={set('personal')} placeholder="어떤 활동을 즐겼나요?" />
      </div>
      <div>
        <Label>🏕️ 캠프에서 내가 한 것들</Label>
        <Hint>각 프로젝트에서 맡은 역할, 실제로 만든 것, 기억에 남는 것을 자유롭게 적어주세요.</Hint>
        <Area value={data.camp_projects} onChange={set('camp_projects')} rows={5}
          placeholder={`기초 프로젝트: 내가 맡은 역할 / 만든 것\n심화 프로젝트: ...\n실전 프로젝트: ...`} />
      </div>
    </div>
  )
}

function EnergyTab({ data, set }: { data: Day1Data; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>⚡ 몰입했던 순간</Label>
        <Hint>언제 시간 가는 줄 몰랐나요? 캠프 안팎 모두 OK</Hint>
        <Area value={data.energy_flow} onChange={set('energy_flow')}
          placeholder="시간 가는 줄 모르고 했던 일이나 활동을 써주세요" />
      </div>
      <div>
        <Label>✨ 잘한다고 느꼈던 순간</Label>
        <Hint>칭찬받았거나 스스로 뿌듯했던 경험. 구체적인 상황일수록 좋아요.</Hint>
        <Area value={data.good_at} onChange={set('good_at')}
          placeholder="어떤 일을 했을 때 잘한다는 느낌이 들었나요?" />
      </div>
      <div>
        <Label>😣 하기 싫었던 것 + 이유</Label>
        <Hint>「적성에 안 맞아서」보다 「숫자가 막막해서」처럼 구체적으로. 피하고 싶은 걸 알면 맞는 방향도 보여요.</Hint>
        <Area value={data.dislike} onChange={set('dislike')} rows={5}
          placeholder={`어떤 작업이 힘들었나요?\n왜 그랬을 것 같나요?`} />
      </div>
    </div>
  )
}

function FindTab({ data, set }: { data: Day1Data; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
        오늘 적으면서 새롭게 발견한 것들을 기록해두세요. 나중에 강점과 방향을 찾을 때 중요한 단서가 됩니다.
      </div>
      <div>
        <Label>✅ 오늘의 발견</Label>
        <Hint>오늘 적으면서 새롭게 발견한 나의 경험, 「경험이라고 생각 못했는데 쓸 수 있겠다」 싶은 것</Hint>
        <Area value={data.today_discovery} onChange={set('today_discovery')} rows={6}
          placeholder={`오늘 적으면서 새롭게 발견한 나의 경험:\n\n「경험이라고 생각 못 했는데, 쓸 수 있겠다」 싶은 것:`} />
      </div>
    </div>
  )
}

// ── 1차 면담 슬랙 초안 화면 ──────────────────────────────────────

function SlackScreen1({ studentName, topJob, topJobPct, fromDay1, onClose }: {
  studentName: string
  topJob: JobType | null
  topJobPct: number
  fromDay1: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const jobName = topJob ? JOB_LABELS_FLAT[topJob] : '마케터'
  const color = topJob ? JOB_COLORS[topJob] : '#64748b'
  const [copied, setCopied] = useState(false)

  const draft = fromDay1
    ? `OO튜터님 안녕하세요, ${studentName}입니다 :)

진로 체크리스트와 DAY 1 경험 정리를 완성했어요. 결과를 보니 **${jobName}** 적합도가 가장 높게 나왔는데요 (${topJobPct}%),

1차 면담을 요청드리고 싶습니다. [지금 / __시에] 잠깐 시간 괜찮으실까요? 10~15분 정도 여쭤보고 싶은 게 있어요 :)`
    : `OO튜터님 안녕하세요, ${studentName}입니다 :)

진로 체크리스트를 완성했어요. 결과를 보니 **${jobName}** 적합도가 가장 높게 나왔는데요 (${topJobPct}%),

면담을 요청드리고 싶습니다. [지금 / __시에] 잠깐 시간 괜찮으실까요? 10~15분 정도 여쭤보고 싶은 게 있어요 :)`

  const handleCopy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDone = () => {
    if (fromDay1) router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleDone} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-lg font-bold text-slate-900 mb-0.5">
            {fromDay1 ? 'DAY 1 완료!' : '체크리스트 완료!'}
          </h2>
          {topJob && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: `${color}14` }}>
              <span className="text-sm font-bold" style={{ color }}>{jobName}</span>
              <span className="text-xs font-medium" style={{ color }}>{topJobPct}%</span>
            </div>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-700 mb-1">
          {fromDay1 ? '💬 1차 면담 슬랙 초안' : '💬 면담 슬랙 초안'}
        </p>
        <p className="text-xs text-slate-400 mb-3">「OO」와 「[지금/__시에]」 부분을 수정한 후 복사하세요</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{draft}</pre>
        </div>

        <button onClick={handleCopy}
          className={`w-full font-semibold py-3 rounded-xl text-sm transition-all mb-2 ${
            copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}>
          {copied ? '✓ 복사됐어요!' : '📋 슬랙 초안 복사하기'}
        </button>

        <button onClick={handleDone}
          className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          완료 (면담 대기 화면으로)
        </button>
      </div>
    </div>
  )
}
