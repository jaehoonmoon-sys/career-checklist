'use client'

import { useState, useTransition } from 'react'
import { JOB_LABELS_FLAT, type JobType } from '@/lib/survey-questions'
import { saveExperiences } from '@/app/actions/checklist'
import { type ExperienceData, EMPTY_EXPERIENCE } from '@/lib/types'

const JOB_COLORS: Record<JobType, string> = {
  performance: '#3b82f6', content: '#8b5cf6', brand: '#ec4899',
  growth: '#10b981', crm: '#f97316', ae: '#6366f1',
}

type Props = {
  studentName: string
  topJob: JobType | null
  jobPct: number
  sessionRound: number
  initialExperiences: ExperienceData
  onClose: () => void
}

export default function PostSaveFlow(props: Props) {
  const [step, setStep] = useState<'choice' | 'experience' | 'slack'>('choice')
  const [fromExp, setFromExp] = useState(false)

  if (step === 'choice') {
    return (
      <ChoiceScreen
        topJob={props.topJob}
        jobPct={props.jobPct}
        onDirectSlack={() => setStep('slack')}
        onExperience={() => setStep('experience')}
        onClose={props.onClose}
      />
    )
  }

  if (step === 'experience') {
    return (
      <ExperienceScreen
        topJob={props.topJob}
        sessionRound={props.sessionRound}
        initialExperiences={props.initialExperiences}
        onComplete={() => { setFromExp(true); setStep('slack') }}
        onBack={() => setStep('choice')}
        onClose={props.onClose}
      />
    )
  }

  return (
    <SlackScreen
      studentName={props.studentName}
      topJob={props.topJob}
      jobPct={props.jobPct}
      fromExperience={fromExp}
      onClose={props.onClose}
    />
  )
}

// ── 선택 화면 ────────────────────────────────────────────────────

function ChoiceScreen({ topJob, jobPct, onDirectSlack, onExperience, onClose }: {
  topJob: JobType | null
  jobPct: number
  onDirectSlack: () => void
  onExperience: () => void
  onClose: () => void
}) {
  const color = topJob ? JOB_COLORS[topJob] : '#64748b'
  return (
    <Backdrop onClose={onClose}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">체크리스트 저장 완료!</h2>
        {topJob && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: `${color}14` }}>
            <span className="font-bold" style={{ color }}>{JOB_LABELS_FLAT[topJob]}</span>
            <span className="text-sm font-medium" style={{ color }}>{jobPct}% 적합도</span>
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
        <button onClick={onExperience}
          className="w-full border-2 border-slate-200 text-slate-700 rounded-2xl p-4 text-left hover:border-slate-300 hover:bg-slate-50 transition-colors active:scale-[0.98]">
          <div className="font-semibold text-base mb-0.5">📝 나의 경험 정리하고 면담하기</div>
          <div className="text-xs text-slate-500">5~10분 투자해서 경험 정리 후 더 풍부한 면담 가능</div>
        </button>
      </div>
    </Backdrop>
  )
}

// ── 경험 정리 폼 ─────────────────────────────────────────────────

const SECTIONS = [
  { key: 'exp',      label: '나의 경험',  emoji: '🗂️' },
  { key: 'energy',   label: '에너지 체크', emoji: '⚡' },
  { key: 'strength', label: '나의 강점',  emoji: '💪' },
  { key: 'direction',label: '취업 방향',  emoji: '🧭' },
] as const

function ExperienceScreen({ topJob, sessionRound, initialExperiences, onComplete, onBack, onClose }: {
  topJob: JobType | null
  sessionRound: number
  initialExperiences: ExperienceData
  onComplete: () => void
  onBack: () => void
  onClose: () => void
}) {
  const [data, setData] = useState<ExperienceData>({ ...EMPTY_EXPERIENCE, ...initialExperiences })
  const [section, setSection] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const set = (key: keyof ExperienceData) =>
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setData(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveExperiences(sessionRound, data)
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← 뒤로</button>
        <h2 className="text-sm font-bold text-slate-900">나의 경험 정리하기</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">✕</button>
      </div>

      {/* 섹션 탭 */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-0 overflow-x-auto shrink-0">
        {SECTIONS.map((s, i) => (
          <button key={s.key} onClick={() => setSection(i)}
            className={`shrink-0 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              section === i
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* 폼 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {section === 0 && <ExpSection data={data} set={set} />}
          {section === 1 && <EnergySection data={data} set={set} />}
          {section === 2 && <StrengthSection data={data} set={set} topJob={topJob} />}
          {section === 3 && <DirectionSection data={data} set={set} />}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <div className="flex gap-2">
            {section < SECTIONS.length - 1 ? (
              <>
                <button onClick={() => setSection(i => i + 1)}
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
                {isPending ? '저장 중...' : '💬 저장하고 슬랙 초안 보기'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 섹션 컴포넌트 ────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-slate-800 mb-1">{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 mb-2 leading-relaxed">{children}</p>
}
type SetFn = (key: keyof ExperienceData) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void

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

function ExpSection({ data, set }: { data: ExperienceData; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
        마케팅 경험이 없어도 괜찮아요. 올리브영 알바, 인스타 운영, 팀 프로젝트 — 모두 경험입니다. <strong>일단 다 꺼내세요.</strong>
      </div>
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
        <Hint>SNS, 블로그, 유튜브, 취미 등 뭐든. 예: 인스타 운영 → 해시태그 전략, 브랜드 덕질, 여행</Hint>
        <Area value={data.personal} onChange={set('personal')} placeholder="어떤 활동을 즐겼나요?" />
      </div>
    </div>
  )
}

function EnergySection({ data, set }: { data: ExperienceData; set: SetFn }) {
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
        <Hint>「적성에 안 맞아서」보다 「숫자가 막막해서」, 「혼자 오래 앉아있는 게 힘들어서」처럼 구체적으로. 피하고 싶은 걸 알면 맞는 방향도 보여요.</Hint>
        <Area value={data.dislike} onChange={set('dislike')} rows={5}
          placeholder={`어떤 작업이 힘들었나요?\n왜 그랬을 것 같나요?`} />
      </div>
    </div>
  )
}

function StrengthSection({ data, set, topJob }: {
  data: ExperienceData; set: SetFn; topJob: JobType | null
}) {
  return (
    <div className="space-y-5">
      {topJob && (
        <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
          체크리스트 결과 <strong className="text-slate-900">{JOB_LABELS_FLAT[topJob]}</strong> 적합도가 가장 높게 나왔어요.<br />
          이 방향과 연결해서 강점을 써보세요.
        </div>
      )}
      <div>
        <Label>💪 나의 강점 3가지</Label>
        <Hint>「나는 __을 잘한다, 왜냐하면 __한 경험이 있기 때문이다」형식으로 써보세요.</Hint>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 mb-2">
          예시: 「나는 사람의 감정을 건드리는 글을 잘 쓴다, 왜냐하면 콘텐츠 프로젝트에서 내 카피를 팀원들이 가장 많이 선택했기 때문이다」
        </div>
        <Area value={data.strengths} onChange={set('strengths')} rows={7}
          placeholder={`강점 1: 나는 __ 을 잘한다, 왜냐하면...\n\n강점 2: 나는 __ 을 잘한다, 왜냐하면...\n\n강점 3: 나는 __ 을 잘한다, 왜냐하면...`} />
      </div>
    </div>
  )
}

function DirectionSection({ data, set }: { data: ExperienceData; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>🥇 1순위 목표 직무 & 이유</Label>
        <Hint>앞서 작성한 경험·강점과 연결해서 이유를 써주세요.</Hint>
        <Area value={data.target_job_1} onChange={set('target_job_1')} rows={3}
          placeholder={`직무명: ___\n이유: 나는 ___ 때문에 이 직무가 맞다고 생각합니다`} />
      </div>
      <div>
        <Label>🥈 2순위 목표 직무 & 이유 <span className="font-normal text-slate-400">(선택)</span></Label>
        <Area value={data.target_job_2} onChange={set('target_job_2')} rows={2}
          placeholder="직무명 + 한 줄 이유 (없으면 비워도 됩니다)" />
      </div>
      <div>
        <Label>🏢 관심 산업 & 일하고 싶은 환경</Label>
        <Hint>IT, 이커머스, 뷰티 등 / 대행사 vs 인하우스 / 스타트업·중소·대기업 등</Hint>
        <Area value={data.industries} onChange={set('industries')} rows={4}
          placeholder={`관심 산업 Top 3:\n대행사 vs 인하우스:\n선호 회사 규모:`} />
      </div>
      <div>
        <Label>📄 목표 JD 링크</Label>
        <Hint>원티드·사람인에서 「이런 곳에서 일하고 싶다」는 느낌이 드는 공고를 하나 찾아보세요.</Hint>
        <input value={data.target_jd_url} onChange={set('target_jd_url')}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-2"
          placeholder="https://..." />
        <Area value={data.target_jd_note} onChange={set('target_jd_note')} rows={4}
          placeholder={`이 JD를 고른 이유:\n할 수 있을 것 같은 부분:\n아직 부족한 부분:`} />
      </div>
    </div>
  )
}

// ── 슬랙 초안 화면 ───────────────────────────────────────────────

function SlackScreen({ studentName, topJob, jobPct, fromExperience, onClose }: {
  studentName: string
  topJob: JobType | null
  jobPct: number
  fromExperience: boolean
  onClose: () => void
}) {
  const jobName = topJob ? JOB_LABELS_FLAT[topJob] : '마케터'
  const [copied, setCopied] = useState(false)

  const draft = `OO튜터님 안녕하세요, ${studentName}입니다 :)

진로 체크리스트${fromExperience ? '와 경험 정리' : ''}를 완성했어요. 결과를 보니 **${jobName}** 적합도가 가장 높게 나왔는데요 (${jobPct}%),

이 방향으로 면담을 요청드리고 싶습니다. [지금 / __시에] 잠깐 시간 괜찮으실까요? 10~15분 정도 여쭤보고 싶은 게 있어요 :)`

  const handleCopy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Backdrop onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-0.5">💬 튜터에게 보낼 슬랙 초안</h2>
      <p className="text-xs text-slate-400 mb-4">「OO」와 「[지금/__시에]」 부분을 수정한 후 복사해서 슬랙에 붙여넣으세요</p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{draft}</pre>
      </div>

      <button onClick={handleCopy}
        className={`w-full font-semibold py-3 rounded-xl text-sm transition-all ${
          copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}>
        {copied ? '✓ 복사됐어요!' : '📋 슬랙 초안 복사하기'}
      </button>

      <button onClick={onClose} className="w-full mt-2 py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        닫기
      </button>
    </Backdrop>
  )
}

// ── 공통 레이아웃 ────────────────────────────────────────────────

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
