'use server'

import { createAdminClient } from '@/lib/supabase'

const REDASH_BASE = 'https://redash-v2.spartacodingclub.kr'
const REDASH_KEY = process.env.redash_user_api_key ?? ''
const DS_ID = 21

// CH.5 강의 진도율 전용 쿼리 (dbonline_v3)
const CH5_SQL = `
WITH dima5_users AS (
    SELECT DISTINCT e.user_id
    FROM enrollment e
    JOIN product_component pc ON pc.id = e.product_component_id
    JOIN product p ON p.id = pc.product_id
    WHERE p.business_id = 48
      AND p.name = '마케팅 실무의 이해'
      AND DATE(e.course_start_date) = '2026-04-20'
      AND e.is_canceled = false
)
SELECT
    u.mongo_user_id  AS online_user_id,
    c.id             AS course_id,
    ROUND(e.progress_rate::numeric, 1) AS progress_rate,
    e.is_completed
FROM dima5_users du
JOIN "user"            u  ON u.id = du.user_id
JOIN enrollment        e  ON e.user_id = du.user_id
                         AND e.is_canceled = false
                         AND e.course_start_date >= '2026-04-20'
JOIN product_component pc ON pc.id = e.product_component_id
JOIN product           p  ON p.id = pc.product_id AND p.business_id = 48
JOIN curriculum        cu ON cu.id = pc.component_id
JOIN course            c  ON c.id = cu.course_id
WHERE c.id IN (309, 319)
ORDER BY u.mongo_user_id, c.id
`

type RedashRow = {
  online_user_id: string
  course_id: number
  progress_rate: number
  is_completed: boolean
}

async function runRedashQuery(): Promise<RedashRow[]> {
  const jobRes = await fetch(`${REDASH_BASE}/api/query_results`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${REDASH_KEY}`,
    },
    body: JSON.stringify({ data_source_id: DS_ID, query: CH5_SQL, max_age: 0 }),
  })

  if (!jobRes.ok) {
    const text = await jobRes.text()
    throw new Error(`Redash 요청 실패 (${jobRes.status}): ${text.slice(0, 200)}`)
  }

  const jobData = await jobRes.json()
  const jobId: string = jobData.job?.id
  if (!jobId) throw new Error('Redash에서 job ID를 받지 못했어요')

  // 폴링: 5초 대기 후 3초 간격으로 최대 12회
  await new Promise(r => setTimeout(r, 5000))

  for (let i = 0; i < 12; i++) {
    const pollRes = await fetch(`${REDASH_BASE}/api/jobs/${jobId}`, {
      headers: { 'Authorization': `Key ${REDASH_KEY}` },
    })
    const pollData = await pollRes.json()
    const job = pollData.job

    if (job.query_result_id) {
      const resultRes = await fetch(`${REDASH_BASE}/api/query_results/${job.query_result_id}`, {
        headers: { 'Authorization': `Key ${REDASH_KEY}` },
      })
      const result = await resultRes.json()
      return result.query_result.data.rows as RedashRow[]
    }

    if (job.error) throw new Error(`Redash 쿼리 오류: ${job.error}`)

    // 다음 폴링까지 3초 대기
    await new Promise(r => setTimeout(r, 3000))
  }

  throw new Error('Redash 쿼리 타임아웃 (최대 41초 초과)')
}

export type SyncResult = {
  synced: number
  skipped: number
  error?: string
}

export async function syncCh5Progress(): Promise<SyncResult> {
  if (!REDASH_KEY) {
    return { synced: 0, skipped: 0, error: 'REDASH API 키가 설정되지 않았습니다' }
  }

  try {
    const rows = await runRedashQuery()

    if (rows.length === 0) {
      return { synced: 0, skipped: 0, error: 'Redash에서 데이터가 반환되지 않았습니다' }
    }

    const adminClient = createAdminClient()

    // online_user_id → supabase student_id 매핑
    const { data: students } = await adminClient
      .from('dm5_students')
      .select('id, online_user_id')
      .eq('is_active', true)
      .not('online_user_id', 'is', null)

    const userIdMap = new Map<string, number>()
    for (const s of students ?? []) {
      if (s.online_user_id) userIdMap.set(s.online_user_id, s.id)
    }

    const now = new Date().toISOString()
    const upsertRows = rows
      .filter(r => userIdMap.has(r.online_user_id))
      .map(r => ({
        student_id: userIdMap.get(r.online_user_id)!,
        course_id: r.course_id,
        progress_rate: r.progress_rate,
        is_completed: r.is_completed,
        synced_at: now,
      }))

    const skipped = rows.length - upsertRows.length

    if (upsertRows.length === 0) {
      return { synced: 0, skipped, error: '매핑되는 수강생이 없습니다 (online_user_id 불일치)' }
    }

    const { error } = await adminClient
      .from('dm5_lecture_progress')
      .upsert(upsertRows, { onConflict: 'student_id,course_id' })

    if (error) throw new Error(error.message)

    return { synced: upsertRows.length, skipped }
  } catch (e) {
    return {
      synced: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
