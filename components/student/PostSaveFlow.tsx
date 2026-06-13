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
  preSelectedJob: JobType | null
  onClose: () => void
}

export default function PostSaveFlow(props: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'choice' | 'day1'>('choice')

  if (step === 'choice') {
    return (
      <ChoiceScreen
        topJob={props.topJob}
        topJobPct={props.topJobPct}
        preSelectedJob={props.preSelectedJob}
        onDay1={() => setStep('day1')}
        onClose={props.onClose}
      />
    )
  }

  return (
    <Day1FormScreen
      topJob={props.topJob}
      sessionRound={props.sessionRound}
      initialDay1={props.initialDay1}
      onComplete={() => { router.refresh(); props.onClose() }}
      onClose={props.onClose}
    />
  )
}

// ── 선택지 화면 ──────────────────────────────────────────────────

function ChoiceScreen({ topJob, topJobPct, preSelectedJob, onDay1, onClose }: {
  topJob: JobType | null
  topJobPct: number
  preSelectedJob: JobType | null
  onDay1: () => void
  onClose: () => void
}) {
  const color = topJob ? JOB_COLORS[topJob] : '#64748b'
  const isSame = preSelectedJob && topJob && preSelectedJob === topJob
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          ✕
        </button>

        <div className="text-center mb-4">
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

        {/* 사전 선택 vs 결과 비교 */}
        {preSelectedJob && topJob && (
          <div className="bg-slate-50 rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">처음 생각한 직무</p>
                <p className="text-sm font-semibold text-slate-600">{JOB_LABELS_FLAT[preSelectedJob]}</p>
              </div>
              <div className="text-slate-300 text-base shrink-0">→</div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">체크리스트 결과</p>
                <p className="text-sm font-bold" style={{ color }}>{JOB_LABELS_FLAT[topJob]}</p>
              </div>
            </div>
            <p className="text-center text-[11px] mt-2 font-medium"
              style={{ color: isSame ? '#10b981' : '#6366f1' }}>
              {isSame ? '예상과 결과가 일치했어요! ✓' : '새로운 발견이 있었나요? 🔍'}
            </p>
          </div>
        )}

        <button onClick={onDay1}
          className="w-full bg-slate-900 text-white rounded-2xl p-4 text-left hover:bg-slate-800 transition-colors active:scale-[0.98]">
          <div className="font-semibold text-base mb-0.5">📝 나의 경험 정리하러 가기</div>
          <div className="text-xs text-slate-400">DAY 1 경험 정리 작성하기</div>
        </button>
      </div>
    </div>
  )
}

// ── DAY 1 폼 (노션 레이아웃 — 단일 스크롤) ──────────────────────

type SetFn = (key: keyof Day1Data) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void

export function Day1FormScreen({ topJob, sessionRound, initialDay1, onComplete, onClose }: {
  topJob: JobType | null
  sessionRound: number
  initialDay1: Day1Data
  onComplete: () => void
  onClose: () => void
}) {
  const [data, setData] = useState<Day1Data>({ ...EMPTY_DAY1, ...initialDay1 })
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState('')

  const set: SetFn = (key) => (e) =>
    setData(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDay1(sessionRound, data)
      if (result?.error) setSaveMsg(result.error)
      else onComplete()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
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

      {/* 폼 내용 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

          {/* 시작 전 읽기 */}
          <D1Callout color="blue" icon="💡">
            <p className="font-semibold mb-1.5">여기서부터가 진짜 취업 준비예요 <span className="font-normal text-xs">— 시작 전 읽기 (5분)</span></p>
            <p className="leading-relaxed mb-2">
              방금 한 체크리스트는 가볍게 재미로 해보는 직무 탐색이었어요.{topJob && <span> 결과로 <strong>{JOB_LABELS_FLAT[topJob]}</strong>이 나왔지만, 이건 단순 참고예요.</span>}<br />
              <strong>진짜 취업 준비는 나의 경험을 꺼내고 정리하는 것에서 시작합니다.</strong>
            </p>
            <p className="leading-relaxed">
              &quot;마케팅 경험이 없는데...&quot;라고 생각할 수 있지만, 마케팅은 생활에 녹아있습니다.<br />
              올리브영 알바에서 고객에게 제품을 추천했다면 → 세일즈와 고객 이해입니다.<br />
              인스타에 올린 사진 한 장도, 친구에게 맛집 추천도 → 모두 커뮤니케이션입니다.<br />
              <strong>일단 다 꺼내놓는 게 오늘의 목표입니다. 선별은 나중에 합니다.</strong>
            </p>
          </D1Callout>

          {/* 파트 1 */}
          <D1SectionHeader title="파트 1 | 캠프 전 나의 경험" time="20분" />

          <D1Field
            label="1-1. 일 / 알바 / 직장 경험"
            desc="어떤 일을 했나요? 마케팅과 관련 없어도 됩니다."
            example="카페 알바 → 고객 응대, 단골 파악 / 올리브영 → 제품 추천, 진열 / 콜센터 → 고객 불만 해결 / 식당 알바 → 주문 패턴 관찰, 메뉴 추천"
          >
            <D1Textarea value={data.work} onChange={set('work')} />
          </D1Field>

          <D1Field
            label="1-2. 학교 / 학습 경험"
            desc="전공, 수업, 동아리, 학생회, 팀 프로젝트 등"
            example="학보사 → 기사 작성, 인터뷰 / 축제 기획단 → 홍보물 제작, SNS 운영 / 경영 수업 → 마케팅 케이스 분석 / 조별 과제 → 기획, 발표 자료 제작"
          >
            <D1Textarea value={data.school} onChange={set('school')} />
          </D1Field>

          <D1Field
            label="1-3. 개인 활동"
            desc="SNS, 블로그, 유튜브, 커뮤니티, 취미, 여행 등 뭐든"
            example="인스타그램 운영 → 콘텐츠 기획, 해시태그 전략 / 독서 블로그 → 꾸준한 글쓰기 / 좋아하는 브랜드 덕질 → 브랜드 분석 / 여행 → 현지 마케팅 관찰"
          >
            <D1Textarea value={data.personal} onChange={set('personal')} />
          </D1Field>

          {/* 파트 2 — 캠프 프로젝트 */}
          <D1SectionHeader title="파트 2 | 캠프에서 내가 한 것들" time="15분" />

          <p className="text-xs font-semibold text-slate-500 -mt-4">🏕️ 기초 프로젝트 (AI 광고 콘텐츠)</p>

          <D1Field label="2-1. 내가 맡은 역할" desc="팀에서 어떤 역할을 담당했나요?">
            <D1Textarea value={data.camp_basic_role} onChange={set('camp_basic_role')} />
          </D1Field>

          <D1Field label="2-2. 실제로 만든 것" desc="결과물로 무엇을 만들었나요?">
            <D1Textarea value={data.camp_basic_made} onChange={set('camp_basic_made')} />
          </D1Field>

          <D1Field label="2-3. 기억에 남는 것" desc="이 프로젝트에서 가장 기억에 남는 순간이나 배운 점">
            <D1Textarea value={data.camp_basic_memory} onChange={set('camp_basic_memory')} />
          </D1Field>

          <p className="text-xs font-semibold text-slate-500">🏕️ 심화 프로젝트 (광고 콘텐츠 제작)</p>

          <D1Field label="2-4. 내가 맡은 역할" desc="팀에서 어떤 역할을 담당했나요?">
            <D1Textarea value={data.camp_adv_role} onChange={set('camp_adv_role')} />
          </D1Field>

          <D1Field label="2-5. 실제로 만든 것" desc="결과물로 무엇을 만들었나요?">
            <D1Textarea value={data.camp_adv_made} onChange={set('camp_adv_made')} />
          </D1Field>

          <D1Field label="2-6. 기억에 남는 것" desc="이 프로젝트에서 가장 기억에 남는 순간이나 배운 점">
            <D1Textarea value={data.camp_adv_memory} onChange={set('camp_adv_memory')} />
          </D1Field>

          {/* 파트 3 — 에너지 체크 */}
          <D1SectionHeader title="파트 3 | 에너지 체크" time="15분" />

          <D1Field label="몰입했던 순간" desc="언제 시간 가는 줄 몰랐나요? (캠프 안팎 모두)">
            <D1Textarea value={data.energy_flow} onChange={set('energy_flow')} />
          </D1Field>

          <D1Field label="잘한다고 느꼈던 순간" desc="칭찬받았거나, 스스로 뿌듯했던 경험">
            <D1Textarea value={data.good_at} onChange={set('good_at')} />
          </D1Field>

          <D1Field label="하기 싫었던 것" desc="어떤 작업이 유독 힘들거나 피하고 싶었나요?">
            <D1Callout color="yellow" icon="💬">
              → <strong>왜 그랬을 것 같나요?</strong> &ldquo;싫다&rdquo;는 감정의 이유를 쓰는 게 핵심입니다.<br />
              &ldquo;적성에 안 맞아서&rdquo;보다 &ldquo;숫자를 다루는 게 막막해서&rdquo;, &ldquo;혼자 오래 앉아있는 게 힘들어서&rdquo;처럼 구체적으로.
            </D1Callout>
            <D1Textarea value={data.dislike} onChange={set('dislike')} placeholder="어떤 것이 힘들었나요? (이유까지 작성)" />
          </D1Field>

          {/* 오늘의 발견 */}
          <D1SectionHeader title="✅ 오늘의 발견" time="5분" />
          <D1Textarea
            value={data.today_discovery}
            onChange={set('today_discovery')}
            rows={5}
            placeholder={`오늘 적으면서 새롭게 발견한 나의 경험:\n\n「경험이라고 생각 못 했는데, 쓸 수 있겠다」 싶은 것:`}
          />

        </div>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="bg-white border-t border-slate-100 p-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {saveMsg && <p className="text-xs text-red-500 mb-2">{saveMsg}</p>}
          <button onClick={handleSave} disabled={isPending}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
            {isPending ? '저장 중...' : '💾 저장 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DAY1 폼 UI 헬퍼 ──────────────────────────────────────────────

function D1SectionHeader({ title, time }: { title: string; time: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-200" />
      <p className="text-xs font-bold text-slate-500 whitespace-nowrap">
        {title} <span className="font-normal text-slate-400">· {time}</span>
      </p>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function D1Field({ label, desc, example, children }: {
  label: string
  desc?: string
  example?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {desc && <p className="text-xs text-slate-500">{desc}</p>}
      {example && (
        <D1Callout color="amber" icon="📎">
          <strong>예시</strong>: {example}
        </D1Callout>
      )}
      {children}
    </div>
  )
}

function D1Callout({ color, icon, children }: {
  color: 'blue' | 'amber' | 'yellow'
  icon: string
  children: React.ReactNode
}) {
  const cls = {
    blue:  'bg-blue-50 border border-blue-100 text-blue-800',
    amber: 'bg-amber-50 border border-amber-100 text-amber-800',
    yellow: 'bg-yellow-50 border border-yellow-100 text-yellow-800',
  }[color]
  return (
    <div className={`${cls} rounded-xl px-3 py-2.5 text-xs leading-relaxed`}>
      <span className="mr-1">{icon}</span>{children}
    </div>
  )
}

function D1Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder ?? '여기에 작성하세요'}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white resize-none transition-colors"
    />
  )
}


