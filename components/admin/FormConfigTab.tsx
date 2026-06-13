'use client'

import { useState, useTransition } from 'react'
import { saveFormConfig } from '@/app/actions/admin'
import { type FormConfig, type FieldCfg, DEFAULT_FORM_CONFIG } from '@/lib/form-config'

// ── 인라인 편집기 ─────────────────────────────────────────────────

function EditableText({
  value,
  onSave,
  multiline = false,
  placeholder,
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <div className="flex items-start gap-2 group">
        <p className="flex-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[1.25rem]">
          {value || <span className="text-slate-300 italic">{placeholder ?? '(없음)'}</span>}
        </p>
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
        >
          수정
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {multiline ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={4}
          className="w-full text-sm bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
          autoFocus
        />
      ) : (
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-full text-sm bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          autoFocus
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { onSave(draft); setEditing(false) }}
          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 font-medium"
        >
          저장
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
        >
          취소
        </button>
      </div>
    </div>
  )
}

// ── 필드 행 ───────────────────────────────────────────────────────

type FieldRowProps = {
  name: string
  cfg: FieldCfg
  showKeys: (keyof FieldCfg)[]
  onChange: (updated: FieldCfg) => void
}

const FIELD_KEY_LABELS: Record<keyof FieldCfg, string> = {
  label: '질문 텍스트',
  desc: '설명',
  example: '예시',
  hint: '힌트',
  placeholder: 'Placeholder',
  callout: '콜아웃',
}

function FieldRow({ name, cfg, showKeys, onChange }: FieldRowProps) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-600">{name}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {showKeys.map(k => (
          <div key={k} className="px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              {FIELD_KEY_LABELS[k]}
            </p>
            <EditableText
              value={(cfg[k] as string) ?? ''}
              onSave={v => onChange({ ...cfg, [k]: v })}
              multiline={k === 'callout' || k === 'example' || k === 'placeholder' || k === 'hint'}
              placeholder={`(${FIELD_KEY_LABELS[k]} 없음)`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 문자열 배열 편집기 ────────────────────────────────────────────

function StringListEditor({
  title,
  items,
  onChange,
}: {
  title: string
  items: string[]
  onChange: (updated: string[]) => void
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-600">{title}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 mb-1.5">{i + 1}번</p>
            <EditableText
              value={item}
              onSave={v => {
                const next = [...items]
                next[i] = v
                onChange(next)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 업무 스타일 편집기 ────────────────────────────────────────────

function WorkStyleEditor({
  items,
  onChange,
}: {
  items: { a: string; b: string }[]
  onChange: (updated: { a: string; b: string }[]) => void
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-600">업무 스타일 항목</p>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400">{i + 1}번 쌍</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">A 쪽</p>
                <EditableText
                  value={item.a}
                  onSave={v => {
                    const next = [...items]
                    next[i] = { ...next[i], a: v }
                    onChange(next)
                  }}
                />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">B 쪽</p>
                <EditableText
                  value={item.b}
                  onSave={v => {
                    const next = [...items]
                    next[i] = { ...next[i], b: v }
                    onChange(next)
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 환경 항목 편집기 ──────────────────────────────────────────────

function EnvItemEditor({
  title,
  items,
  onChange,
}: {
  title: string
  items: { label: string; desc: string }[]
  onChange: (updated: { label: string; desc: string }[]) => void
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-600">{title}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400">{item.label}</p>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">이름</p>
              <EditableText
                value={item.label}
                onSave={v => {
                  const next = [...items]
                  next[i] = { ...next[i], label: v }
                  onChange(next)
                }}
              />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">설명</p>
              <EditableText
                value={item.desc}
                onSave={v => {
                  const next = [...items]
                  next[i] = { ...next[i], desc: v }
                  onChange(next)
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 저장 배너 ─────────────────────────────────────────────────────

function SaveBanner({ dirty, onSave, onReset, isPending }: {
  dirty: boolean
  onSave: () => void
  onReset: () => void
  isPending: boolean
}) {
  if (!dirty) return null
  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-amber-200 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <p className="text-xs text-amber-700 font-medium">⚠️ 저장하지 않은 변경사항이 있습니다. 저장해야 수강생에게 반영됩니다.</p>
      <div className="flex gap-2 shrink-0">
        <button onClick={onReset} disabled={isPending}
          className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50">
          되돌리기
        </button>
        <button onClick={onSave} disabled={isPending}
          className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {isPending ? '저장 중...' : '전체 저장'}
        </button>
      </div>
    </div>
  )
}

// ── 메인 탭 ───────────────────────────────────────────────────────

export default function FormConfigTab({ initialConfig }: { initialConfig: FormConfig }) {
  const [config, setConfig] = useState<FormConfig>(initialConfig)
  const [dirty, setDirty] = useState(false)
  const [activeDay, setActiveDay] = useState<'day1' | 'day23'>('day1')
  const [saveMsg, setSaveMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const update = <T,>(
    section: 'day1' | 'day23',
    key: string,
    value: T
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
    setDirty(true)
    setSaveMsg('')
  }

  const updateField = (
    section: 'day1' | 'day23',
    key: string,
    updated: FieldCfg
  ) => update(section, key, updated)

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveFormConfig(config)
      if (result.error) setSaveMsg(result.error)
      else { setSaveMsg('저장되었습니다.'); setDirty(false) }
    })
  }

  const handleReset = () => {
    setConfig(initialConfig)
    setDirty(false)
    setSaveMsg('')
  }

  const d1 = config.day1
  const d23 = config.day23

  return (
    <div className="flex flex-col min-h-0">
      {/* 서브 탭 */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
        {(['day1', 'day23'] as const).map(day => (
          <button key={day} onClick={() => setActiveDay(day)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeDay === day
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {day === 'day1' ? 'DAY 1 — 나의 경험 꺼내기' : 'DAY 2+3 — 마케터 & 취업 방향'}
          </button>
        ))}
      </div>

      {saveMsg && (
        <p className={`text-xs mb-3 font-medium ${saveMsg.includes('오류') ? 'text-red-500' : 'text-emerald-600'}`}>
          {saveMsg}
        </p>
      )}

      {/* DAY 1 */}
      {activeDay === 'day1' && (
        <div className="space-y-4">
          {/* 인트로 콜아웃 */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600">시작 전 읽기 (인트로 안내문)</p>
            </div>
            <div className="px-4 py-3">
              <EditableText
                value={d1.intro_callout}
                onSave={v => update('day1', 'intro_callout', v)}
                multiline
              />
            </div>
          </div>

          {/* 파트 1 */}
          <SectionLabel>파트 1 | 캠프 전 나의 경험</SectionLabel>

          {(
            [
              ['work', '1-1. 일/알바/직장 경험', ['label', 'desc', 'example']],
              ['school', '1-2. 학교/학습 경험', ['label', 'desc', 'example']],
              ['personal', '1-3. 개인 활동', ['label', 'desc', 'example']],
            ] as [keyof typeof d1, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d1[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day1', key, v)} />
          ))}

          {/* 파트 2 */}
          <SectionLabel>파트 2 | 캠프 프로젝트</SectionLabel>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600">기초 프로젝트 소제목</p>
            </div>
            <div className="px-4 py-3">
              <EditableText value={d1.camp_basic_subtitle}
                onSave={v => update('day1', 'camp_basic_subtitle', v)} />
            </div>
          </div>

          {(
            [
              ['camp_basic_role', '2-1. 기초 — 내가 맡은 역할', ['label', 'desc']],
              ['camp_basic_made', '2-2. 기초 — 실제로 만든 것', ['label', 'desc']],
              ['camp_basic_memory', '2-3. 기초 — 기억에 남는 것', ['label', 'desc']],
            ] as [keyof typeof d1, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d1[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day1', key, v)} />
          ))}

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600">심화 프로젝트 소제목</p>
            </div>
            <div className="px-4 py-3">
              <EditableText value={d1.camp_adv_subtitle}
                onSave={v => update('day1', 'camp_adv_subtitle', v)} />
            </div>
          </div>

          {(
            [
              ['camp_adv_role', '2-4. 심화 — 내가 맡은 역할', ['label', 'desc']],
              ['camp_adv_made', '2-5. 심화 — 실제로 만든 것', ['label', 'desc']],
              ['camp_adv_memory', '2-6. 심화 — 기억에 남는 것', ['label', 'desc']],
            ] as [keyof typeof d1, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d1[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day1', key, v)} />
          ))}

          {/* 파트 3 */}
          <SectionLabel>파트 3 | 에너지 체크</SectionLabel>

          {(
            [
              ['energy_flow', '몰입했던 순간', ['label', 'desc']],
              ['good_at', '잘한다고 느꼈던 순간', ['label', 'desc']],
              ['dislike', '하기 싫었던 것', ['label', 'desc', 'callout']],
            ] as [keyof typeof d1, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d1[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day1', key, v)} />
          ))}

          {/* 오늘의 발견 */}
          <SectionLabel>오늘의 발견</SectionLabel>
          <FieldRow name="Placeholder 텍스트" cfg={d1.today_discovery} showKeys={['placeholder']}
            onChange={v => updateField('day1', 'today_discovery', v)} />
        </div>
      )}

      {/* DAY 2+3 */}
      {activeDay === 'day23' && (
        <div className="space-y-4">
          {/* DAY 2 */}
          <SectionLabel>DAY 2 | 파트 1 — 커리큘럼 체크</SectionLabel>

          <StringListEditor
            title="커리큘럼 영역 이름 (8개)"
            items={d23.curriculum_areas}
            onChange={v => update('day23', 'curriculum_areas', v)}
          />

          <SectionLabel>DAY 2 | 파트 2 — 업무 스타일</SectionLabel>

          <WorkStyleEditor
            items={d23.work_style_items}
            onChange={v => update('day23', 'work_style_items', v)}
          />

          <SectionLabel>DAY 2 | 파트 3 — 강점 & 한 문장</SectionLabel>

          {(
            [
              ['strengths', '💪 나의 강점 3가지', ['label', 'hint', 'callout', 'placeholder']],
              ['marketer_sentence', '✍️ 한 문장 완성', ['label', 'hint', 'placeholder']],
            ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 1 — 목표 직무</SectionLabel>

          {(
            [
              ['target_job_1', '🥇 1순위 목표 직무', ['label', 'hint', 'placeholder']],
              ['target_job_2', '🥈 2순위 목표 직무', ['label', 'placeholder']],
            ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 2 — 관심 산업</SectionLabel>

          {(
            [
              ['industries', '🏭 관심 산업 Top 3', ['label', 'hint', 'placeholder']],
              ['industry_connection', '🔗 DAY 1 경험과 연결하기', ['label', 'hint', 'placeholder']],
            ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 3 — 일하고 싶은 환경</SectionLabel>

          <EnvItemEditor
            title="대행사 / 인하우스 항목"
            items={d23.work_env_type_items}
            onChange={v => update('day23', 'work_env_type_items', v)}
          />

          <EnvItemEditor
            title="회사 규모 항목"
            items={d23.work_env_size_items}
            onChange={v => update('day23', 'work_env_size_items', v)}
          />

          <SectionLabel>DAY 3 | 파트 4 — 목표 JD</SectionLabel>

          {(
            [
              ['target_jd_url', '📄 목표 JD 링크', ['label', 'hint']],
              ['target_jd_note', '메모', ['placeholder']],
            ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]
          ).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateField('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 5 — 취업 나침반 초안</SectionLabel>

          <FieldRow name="🧭 취업 나침반 초안" cfg={d23.compass_draft} showKeys={['label', 'hint', 'placeholder']}
            onChange={v => updateField('day23', 'compass_draft', v)} />
        </div>
      )}

      <SaveBanner dirty={dirty} onSave={handleSave} onReset={handleReset} isPending={isPending} />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-slate-200" />
      <p className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}
