'use client'

import { useState, useTransition } from 'react'
import { saveFormConfig } from '@/app/actions/admin'
import {
  type FormConfig, type SectionDef, type FieldDef, type FieldCfg,
  DEFAULT_FORM_CONFIG,
} from '@/lib/form-config'
import { EMPTY_DAY1, EMPTY_DAY23, EMPTY_DAY5 } from '@/lib/types'
import { Day1FormScreen } from '@/components/student/PostSaveFlow'
import { Day23FormScreen, Day5FormScreen } from '@/components/student/CareerJourneyView'

// ── 인라인 편집기 ─────────────────────────────────────────────────

function EditableText({
  value, onSave, multiline = false, placeholder,
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
        <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">
          취소
        </button>
      </div>
    </div>
  )
}

// ── 개별 필드 편집기 ──────────────────────────────────────────────

function FieldEditor({ field, onChange }: {
  field: FieldDef
  onChange: (f: FieldDef) => void
}) {
  const upd = (key: keyof FieldDef, val: string) =>
    onChange({ ...field, [key]: val || undefined })

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">질문 제목</p>
        <EditableText value={field.label} onSave={v => onChange({ ...field, label: v })} />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 mb-1">설명</p>
        <EditableText value={field.desc ?? ''} onSave={v => upd('desc', v)} placeholder="(설명 없음)" />
      </div>
      {(field.example !== undefined || !field.fixed) && (
        <div>
          <p className="text-[10px] text-slate-400 mb-1">예시</p>
          <EditableText value={field.example ?? ''} onSave={v => upd('example', v)} multiline placeholder="(예시 없음)" />
        </div>
      )}
      {field.callout !== undefined && (
        <div>
          <p className="text-[10px] text-slate-400 mb-1">콜아웃 (→ 안내 박스)</p>
          <EditableText value={field.callout} onSave={v => upd('callout', v)} multiline />
        </div>
      )}
      {(field.placeholder !== undefined || !field.fixed) && (
        <div>
          <p className="text-[10px] text-slate-400 mb-1">Placeholder</p>
          <EditableText value={field.placeholder ?? ''} onSave={v => upd('placeholder', v)} multiline placeholder="(기본값 사용)" />
        </div>
      )}
    </div>
  )
}

// ── 섹션 편집기 ───────────────────────────────────────────────────

function SectionEditor({ section, onUpdate, onDelete }: {
  section: SectionDef
  onUpdate: (s: SectionDef) => void
  onDelete: () => void
}) {
  const updField = (fieldIdx: number, f: FieldDef) => {
    const fields = [...section.fields]
    fields[fieldIdx] = f
    onUpdate({ ...section, fields })
  }

  const deleteField = (fieldIdx: number) => {
    onUpdate({ ...section, fields: section.fields.filter((_, i) => i !== fieldIdx) })
  }

  const addField = () => {
    const newField: FieldDef = {
      id: `extra_${Date.now()}`,
      type: 'textarea',
      label: '새 질문',
      fixed: false,
    }
    onUpdate({ ...section, fields: [...section.fields, newField] })
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">파트 제목</p>
              <EditableText
                value={section.title}
                onSave={v => onUpdate({ ...section, title: v })}
              />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">소요 시간</p>
              <EditableText
                value={section.time ?? ''}
                onSave={v => onUpdate({ ...section, time: v || undefined })}
                placeholder="예: 20분"
              />
            </div>
          </div>
          {!section.fixed && (
            <button
              onClick={onDelete}
              className="shrink-0 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors mt-1"
            >
              파트 삭제
            </button>
          )}
        </div>
      </div>

      {/* 필드 목록 */}
      <div className="divide-y divide-slate-50">
        {section.fields.map((field, fieldIdx) => (
          <div key={field.id} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {field.type === 'subtitle' ? (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">소제목</p>
                    <EditableText
                      value={field.label}
                      onSave={v => updField(fieldIdx, { ...field, label: v })}
                    />
                  </div>
                ) : (
                  <FieldEditor field={field} onChange={f => updField(fieldIdx, f)} />
                )}
              </div>
              {!field.fixed && (
                <button
                  onClick={() => deleteField(fieldIdx)}
                  className="shrink-0 text-slate-300 hover:text-red-500 transition-colors text-sm mt-0.5 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 질문 추가 버튼 */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={addField}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          + 질문 추가
        </button>
      </div>
    </div>
  )
}

// ── 문자열 배열 편집기 (커리큘럼 영역 — 테이블 형태) ──────────────

function DisabledCheck() {
  return <div className="w-4 h-4 rounded border-2 border-slate-200 inline-block" />
}

function StringListEditor({ title, items, onChange }: {
  title: string
  items: string[]
  onChange: (updated: string[]) => void
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-600">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 font-semibold text-slate-600">영역 (클릭해서 수정)</th>
              <th className="px-3 py-2 font-semibold text-slate-300 text-center w-16">흥미로웠다</th>
              <th className="px-3 py-2 font-semibold text-slate-300 text-center w-12">잘했다</th>
              <th className="px-3 py-2 font-semibold text-slate-300 text-center w-12">별로였다</th>
              <th className="px-3 py-2 font-semibold text-slate-300 text-left">한 줄 코멘트</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  <EditableText value={item}
                    onSave={v => { const next = [...items]; next[i] = v; onChange(next) }} />
                </td>
                <td className="px-3 py-2 text-center"><DisabledCheck /></td>
                <td className="px-3 py-2 text-center"><DisabledCheck /></td>
                <td className="px-3 py-2 text-center"><DisabledCheck /></td>
                <td className="px-3 py-2 text-slate-300 italic">작성 칸</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 업무 스타일 편집기 (테이블 형태) ─────────────────────────────

function WorkStyleEditor({ items, onChange }: {
  items: { a: string; b: string }[]
  onChange: (updated: { a: string; b: string }[]) => void
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-600">업무 스타일 항목 (클릭해서 수정)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2 font-semibold text-slate-600 text-right w-[35%]">A 쪽</th>
              <th className="px-3 py-2 font-semibold text-slate-300 text-center w-16">점수 (1→5)</th>
              <th className="px-3 py-2 font-semibold text-slate-600 text-left w-[35%]">B 쪽</th>
              <th className="px-3 py-2 font-semibold text-slate-300 text-left">코멘트</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-2 text-right">
                  <EditableText value={item.a}
                    onSave={v => { const next = [...items]; next[i] = { ...next[i], a: v }; onChange(next) }} />
                </td>
                <td className="px-3 py-2 text-center text-slate-300 italic">1→5</td>
                <td className="px-3 py-2">
                  <EditableText value={item.b}
                    onSave={v => { const next = [...items]; next[i] = { ...next[i], b: v }; onChange(next) }} />
                </td>
                <td className="px-3 py-2 text-slate-300 italic">작성 칸</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 환경 항목 편집기 ──────────────────────────────────────────────

function EnvItemEditor({ title, items, onChange }: {
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
              <EditableText value={item.label}
                onSave={v => { const next = [...items]; next[i] = { ...next[i], label: v }; onChange(next) }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">설명</p>
              <EditableText value={item.desc}
                onSave={v => { const next = [...items]; next[i] = { ...next[i], desc: v }; onChange(next) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FieldCfg 행 (DAY2+3용) ────────────────────────────────────────

type FieldRowProps = {
  name: string
  cfg: FieldCfg
  showKeys: (keyof FieldCfg)[]
  onChange: (updated: FieldCfg) => void
}

const FIELD_KEY_LABELS: Record<keyof FieldCfg, string> = {
  label: '질문 텍스트', desc: '설명', example: '예시',
  hint: '힌트', placeholder: 'Placeholder', callout: '콜아웃',
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
      <p className="text-xs text-amber-700 font-medium">⚠️ 저장하지 않은 변경사항이 있습니다.</p>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-slate-200" />
      <p className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// ── 메인 탭 ───────────────────────────────────────────────────────

export default function FormConfigTab({ initialConfig }: { initialConfig: FormConfig }) {
  const [config, setConfig] = useState<FormConfig>(initialConfig)
  const [dirty, setDirty] = useState(false)
  const [activeDay, setActiveDay] = useState<'day1' | 'day23' | 'day5'>('day1')
  const [saveMsg, setSaveMsg] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState<'day1' | 'day23' | 'day5' | null>(null)

  const markDirty = () => { setDirty(true); setSaveMsg('') }

  const update = <T,>(section: 'day1' | 'day23' | 'day5', key: string, value: T) => {
    setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }))
    markDirty()
  }

  const updateFieldCfg = (section: 'day1' | 'day23' | 'day5', key: string, updated: FieldCfg) =>
    update(section, key, updated)

  // DAY1 섹션 조작
  const updateSection = (sectionIdx: number, updated: SectionDef) => {
    setConfig(prev => {
      const sections = [...prev.day1.sections]
      sections[sectionIdx] = updated
      return { ...prev, day1: { ...prev.day1, sections } }
    })
    markDirty()
  }

  const deleteSection = (sectionIdx: number) => {
    setConfig(prev => ({
      ...prev,
      day1: { ...prev.day1, sections: prev.day1.sections.filter((_, i) => i !== sectionIdx) },
    }))
    markDirty()
  }

  const addSection = () => {
    const newSection: SectionDef = {
      id: `section_${Date.now()}`,
      title: '새 파트',
      time: '',
      fixed: false,
      fields: [],
    }
    setConfig(prev => ({
      ...prev,
      day1: { ...prev.day1, sections: [...prev.day1.sections, newSection] },
    }))
    markDirty()
  }

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
  const d5 = config.day5

  // 미리보기용 DAY23 빈 데이터 (config 기준)
  const emptyDay23ForPreview = {
    ...EMPTY_DAY23,
    curriculum:    d23.curriculum_areas.map(() => ({ interesting: false, good_at: false, boring: false, comment: '' })),
    work_style:    d23.work_style_items.map(() => ({ score: '', comment: '' })),
    work_env_type: d23.work_env_type_items.map(() => ({ choice: '', reason: '' })),
    work_env_size: d23.work_env_size_items.map(() => ({ choice: '', reason: '' })),
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* 서브 탭 + 미리보기 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['day1', 'day23', 'day5'] as const).map(day => (
            <button key={day} onClick={() => setActiveDay(day)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeDay === day ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {day === 'day1' ? 'DAY 1' : day === 'day23' ? 'DAY 2+3' : 'DAY 5'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowPreview(activeDay)}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          👁 미리보기
        </button>
      </div>

      {saveMsg && (
        <p className={`text-xs mb-3 font-medium ${saveMsg.includes('오류') ? 'text-red-500' : 'text-emerald-600'}`}>
          {saveMsg}
        </p>
      )}

      {/* ── DAY 1 탭 ──────────────────────────────────────── */}
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

          {/* 섹션 목록 */}
          {d1.sections.map((section, sectionIdx) => (
            <SectionEditor
              key={section.id}
              section={section}
              onUpdate={updated => updateSection(sectionIdx, updated)}
              onDelete={() => deleteSection(sectionIdx)}
            />
          ))}

          {/* 파트 추가 버튼 */}
          <button
            onClick={addSection}
            className="w-full border border-dashed border-slate-200 rounded-xl py-3 text-xs text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
          >
            + 새 파트 추가
          </button>
        </div>
      )}

      {/* ── DAY 2+3 탭 ────────────────────────────────────── */}
      {activeDay === 'day23' && (
        <div className="space-y-4">
          {/* 섹션/카드 제목 */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600">섹션 & 카드 제목</p>
            </div>
            <div className="divide-y divide-slate-50">
              {([
                ['day2_title',       'DAY 2 섹션 제목'],
                ['card_curriculum',  '파트 1 | 커리큘럼 체크 카드'],
                ['card_workstyle',   '파트 2 | 업무 스타일 카드'],
                ['card_strengths',   '파트 3 | 강점 & 한 문장 카드'],
                ['day3_title',       'DAY 3 섹션 제목'],
                ['card_target_job',  '파트 1 | 목표 직무 카드'],
                ['card_industries',  '파트 2 | 관심 산업 카드'],
                ['card_work_env',    '파트 3 | 일하고 싶은 환경 카드'],
                ['card_target_jd',   '파트 4 | 목표 JD 카드'],
                ['card_compass',     '파트 5 | 취업 나침반 카드'],
              ] as [keyof typeof d23, string][]).map(([key, name]) => (
                <div key={key} className="px-4 py-3 flex items-center gap-3">
                  <p className="text-xs text-slate-500 w-36 shrink-0">{name}</p>
                  <EditableText
                    value={d23[key] as string}
                    onSave={v => update('day23', key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          <SectionLabel>DAY 2 | 파트 1 — 커리큘럼 체크</SectionLabel>

          <StringListEditor
            title="커리큘럼 영역 이름"
            items={d23.curriculum_areas}
            onChange={v => update('day23', 'curriculum_areas', v)}
          />

          <SectionLabel>DAY 2 | 파트 2 — 업무 스타일</SectionLabel>

          <WorkStyleEditor
            items={d23.work_style_items}
            onChange={v => update('day23', 'work_style_items', v)}
          />

          <SectionLabel>DAY 2 | 파트 3 — 강점 & 한 문장</SectionLabel>

          {([
            ['strengths', '💪 나의 강점 3가지', ['label', 'hint', 'callout', 'placeholder']],
            ['marketer_sentence', '✍️ 한 문장 완성', ['label', 'hint', 'placeholder']],
          ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateFieldCfg('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 1 — 목표 직무</SectionLabel>

          {([
            ['target_job_1', '🥇 1순위 목표 직무', ['label', 'hint', 'placeholder']],
            ['target_job_2', '🥈 2순위 목표 직무', ['label', 'placeholder']],
          ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateFieldCfg('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 2 — 관심 산업</SectionLabel>

          {([
            ['industries', '🏭 관심 산업 Top 3', ['label', 'hint', 'placeholder']],
            ['industry_connection', '🔗 DAY 1 경험과 연결하기', ['label', 'hint', 'placeholder']],
          ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateFieldCfg('day23', key, v)} />
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

          {([
            ['target_jd_url', '📄 목표 JD 링크', ['label', 'hint']],
            ['target_jd_note', '메모', ['placeholder']],
          ] as [keyof typeof d23, string, (keyof FieldCfg)[]][]).map(([key, name, keys]) => (
            <FieldRow key={key} name={name} cfg={d23[key] as FieldCfg} showKeys={keys}
              onChange={v => updateFieldCfg('day23', key, v)} />
          ))}

          <SectionLabel>DAY 3 | 파트 5 — 취업 나침반 초안</SectionLabel>

          <FieldRow name="🧭 취업 나침반 초안" cfg={d23.compass_draft} showKeys={['label', 'hint', 'placeholder']}
            onChange={v => updateFieldCfg('day23', 'compass_draft', v)} />
        </div>
      )}

      {/* ── DAY 5 탭 ────────────────────────────────────────── */}
      {activeDay === 'day5' && (
        <div className="space-y-4">
          {/* 나침반 필드 */}
          <SectionLabel>파트 1 | 나의 취업 나침반 완성</SectionLabel>

          <FieldRow name={d5.compass_who.label} cfg={d5.compass_who} showKeys={['label', 'placeholder']}
            onChange={v => updateFieldCfg('day5', 'compass_who', v)} />
          <FieldRow name={d5.compass_where.label} cfg={d5.compass_where} showKeys={['label', 'placeholder']}
            onChange={v => updateFieldCfg('day5', 'compass_where', v)} />
          <FieldRow name={d5.compass_why.label} cfg={d5.compass_why} showKeys={['label', 'hint', 'placeholder']}
            onChange={v => updateFieldCfg('day5', 'compass_why', v)} />

          {/* 체크리스트 항목 */}
          <SectionLabel>파트 2 | 세션 전 체크리스트 항목</SectionLabel>
          <StringListEditor
            title="체크리스트 항목"
            items={d5.pre_checklist_items}
            onChange={items => update('day5', 'pre_checklist_items', items)}
          />

          {/* 앞으로의 노력 */}
          <SectionLabel>파트 3 | 앞으로의 노력</SectionLabel>
          <FieldRow name={d5.future_efforts.label} cfg={d5.future_efforts} showKeys={['label', 'placeholder']}
            onChange={v => updateFieldCfg('day5', 'future_efforts', v)} />
        </div>
      )}

      <SaveBanner dirty={dirty} onSave={handleSave} onReset={handleReset} isPending={isPending} />

      <SaveBanner dirty={dirty} onSave={handleSave} onReset={handleReset} isPending={isPending} />

      {/* ── 미리보기 오버레이 ─────────────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 z-[50] flex flex-col">
          <div className="bg-slate-900/95 backdrop-blur text-white px-4 py-2.5 flex items-center justify-between shrink-0 z-[60] relative">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">미리보기</span>
              <span className="text-sm font-semibold">
                {showPreview === 'day1' ? 'DAY 1 수강생 폼 미리보기'
                  : showPreview === 'day23' ? 'DAY 2+3 수강생 폼 미리보기'
                  : 'DAY 5 수강생 폼 미리보기'}
              </span>
              <span className="text-xs text-slate-400">— 저장되지 않습니다</span>
            </div>
            <button
              onClick={() => setShowPreview(null)}
              className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              ✕ 미리보기 닫기
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50">
            {showPreview === 'day1' && (
              <Day1FormScreen
                topJob="content"
                sessionRound={0}
                initialDay1={EMPTY_DAY1}
                formConfig={config}
                onComplete={() => setShowPreview(null)}
                onClose={() => setShowPreview(null)}
              />
            )}
            {showPreview === 'day23' && (
              <Day23FormScreen
                studentName="미리보기"
                sessionRound={0}
                topJob={null}
                initialData={emptyDay23ForPreview}
                tutorComment={null}
                formConfig={config}
                onComplete={() => setShowPreview(null)}
              />
            )}
            {showPreview === 'day5' && (
              <Day5FormScreen
                studentName="미리보기"
                sessionRound={0}
                initialData={EMPTY_DAY5}
                tutorComment={null}
                formConfig={config}
                onComplete={() => setShowPreview(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
