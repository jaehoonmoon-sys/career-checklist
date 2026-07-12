'use server'

import { createAdminClient } from '@/lib/supabase'

const SHEET_ID = '1J_GLHJm_jiONnxKUfzYRTiA5m8mXQSSElkHyvaN2rJA'
const SHEET_GID = '1305589957'

export type ClassType = 'content' | 'content_data' | 'data'

export type ClassSelectionRow = {
  student_name: string
  chosen_class: ClassType
  previous_chosen_class: ClassType | null
  resubmit_count: number
  content_pref: number | null
  content_data_pref: number | null
  data_pref: number | null
  reason: string | null
  difficult_parts: string | null
  submitted_at: string | null
  synced_at: string | null
}

export type ClassOverrideRow = {
  student_name: string
  assigned_class: ClassType
  moved_by: string | null
  move_reason: string | null
  updated_at: string | null
}

export type ClassSyncResult = {
  synced: number
  skipped: number
  error?: string
}

// ── CSV 파싱 (RFC 4180) ──────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(cell)
        cell = ''
      } else if (ch === '\n') {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else if (ch === '\r') {
        // skip
      } else {
        cell += ch
      }
    }
  }

  if (cell || row.length > 0) {
    row.push(cell)
    if (row.some(c => c.trim())) rows.push(row)
  }

  return rows
}

function mapClass(raw: string): ClassType {
  const t = raw.trim()
  if (t.includes('콘텐츠 + 데이터') || t.includes('콘텐츠+데이터')) return 'content_data'
  if (t.includes('데이터')) return 'data'
  return 'content'
}

// ── 시트 동기화 ──────────────────────────────────────────────────────────────

export async function syncClassSelection(): Promise<ClassSyncResult> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return { synced: 0, skipped: 0, error: `시트 fetch 실패 (${res.status}). 시트가 "링크 있는 사용자 보기 가능"으로 설정되었는지 확인해 주세요.` }
    }

    const text = await res.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return { synced: 0, skipped: 0, error: '시트에 데이터가 없습니다.' }
    }

    const dataRows = rows.slice(1).filter(r => r.length >= 4 && r[2]?.trim())

    // 제출 횟수 집계
    const countByName = new Map<string, number>()
    for (const row of dataRows) {
      const name = row[2].trim()
      countByName.set(name, (countByName.get(name) ?? 0) + 1)
    }

    // 첫 제출과 마지막 제출 추적
    const firstByName = new Map<string, string[]>()
    const lastByName = new Map<string, string[]>()
    for (const row of dataRows) {
      const name = row[2].trim()
      if (!firstByName.has(name)) firstByName.set(name, row)
      lastByName.set(name, row)
    }

    const now = new Date().toISOString()
    const upsertRows = Array.from(lastByName.entries()).map(([name, r]) => {
      const firstRow = firstByName.get(name)!
      const chosenClass = mapClass(r[3] ?? '')
      const firstClass = mapClass(firstRow[3] ?? '')
      const count = countByName.get(name) ?? 1
      return {
        student_name: name,
        chosen_class: chosenClass,
        previous_chosen_class: count > 1 ? firstClass : null,
        resubmit_count: count,
        content_pref: r[4] ? parseInt(r[4], 10) || null : null,
        content_data_pref: r[5] ? parseInt(r[5], 10) || null : null,
        data_pref: r[6] ? parseInt(r[6], 10) || null : null,
        reason: r[7]?.trim() || null,
        difficult_parts: r[8]?.trim() || null,
        submitted_at: r[0]?.trim() || null,
        synced_at: now,
      }
    })

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('dm5_class_selection')
      .upsert(upsertRows, { onConflict: 'student_name' })

    if (error) throw new Error(error.message)

    return { synced: upsertRows.length, skipped: dataRows.length - upsertRows.length }
  } catch (e) {
    return {
      synced: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ── 조회 ─────────────────────────────────────────────────────────────────────

export async function getClassSelectionData(): Promise<ClassSelectionRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('dm5_class_selection')
    .select('*')
    .order('student_name')

  if (error) throw new Error(error.message)
  return (data ?? []) as ClassSelectionRow[]
}

export async function getClassOverrides(): Promise<ClassOverrideRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('dm5_class_override')
    .select('*')

  if (error) throw new Error(error.message)
  return (data ?? []) as ClassOverrideRow[]
}

// ── 분반 이동 저장 ────────────────────────────────────────────────────────────

export async function saveClassOverride(
  studentName: string,
  assignedClass: ClassType,
  movedBy: string,
  moveReason: string,
): Promise<{ error?: string }> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('dm5_class_override')
    .upsert(
      {
        student_name: studentName,
        assigned_class: assignedClass,
        moved_by: movedBy.trim(),
        move_reason: moveReason.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_name' },
    )

  return error ? { error: error.message } : {}
}

export async function deleteClassOverride(
  studentName: string,
): Promise<{ error?: string }> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('dm5_class_override')
    .delete()
    .eq('student_name', studentName)

  return error ? { error: error.message } : {}
}
