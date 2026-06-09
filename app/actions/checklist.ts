'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient, supabase } from '@/lib/supabase'
import { type Day1Data, type Day23Data, type Day5Data } from '@/lib/types'

export async function getCompetencyItems() {
  const { data, error } = await supabase
    .from('cc_competency_items')
    .select('id, job_type, item_text, order_index')
    .order('job_type')
    .order('order_index')

  if (error) return []
  return data ?? []
}

export async function getStudentResponse(sessionRound: number) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return null

  const { data } = await supabase
    .from('cc_checklist_responses')
    .select(
      'competency_answers, common_experiences, notes, stage, tutor_comment_1, tutor_comment_2, day1_data, day23_data, day5_data'
    )
    .eq('student_id', Number(studentId))
    .eq('session_round', sessionRound)
    .single()

  return data ?? null
}

export async function saveCompetencyAnswers(
  sessionRound: number,
  competencyAnswers: Record<string, number>
) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .upsert(
      {
        student_id: Number(studentId),
        session_round: sessionRound,
        competency_answers: competencyAnswers,
      },
      { onConflict: 'student_id,session_round' }
    )

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}

export async function saveDay1(sessionRound: number, data: Day1Data) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .upsert(
      {
        student_id: Number(studentId),
        session_round: sessionRound,
        day1_data: data,
        stage: 1,
      },
      { onConflict: 'student_id,session_round' }
    )

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}

export async function saveDay23(sessionRound: number, data: Day23Data) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .upsert(
      {
        student_id: Number(studentId),
        session_round: sessionRound,
        day23_data: data,
        stage: 3,
      },
      { onConflict: 'student_id,session_round' }
    )

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}

export async function saveDay5(sessionRound: number, data: Day5Data) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .upsert(
      {
        student_id: Number(studentId),
        session_round: sessionRound,
        day5_data: data,
        stage: 5,
      },
      { onConflict: 'student_id,session_round' }
    )

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}

export async function skipTutorComment1(sessionRound: number) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: 2 })
    .eq('student_id', Number(studentId))
    .eq('session_round', sessionRound)

  if (error) return { error: '오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}

export type RollbackTarget = 'checklist' | 'day1' | 'day23' | 'day5'

export async function rollbackStage(
  sessionRound: number,
  target: RollbackTarget
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateData: Record<string, any>
  switch (target) {
    case 'checklist':
      updateData = { competency_answers: {}, day1_data: null, day23_data: null, day5_data: null, tutor_comment_1: null, tutor_comment_2: null, stage: 0 }
      break
    case 'day1':
      updateData = { day1_data: null, day23_data: null, day5_data: null, tutor_comment_1: null, tutor_comment_2: null, stage: 0 }
      break
    case 'day23':
      updateData = { day23_data: null, day5_data: null, tutor_comment_2: null, stage: 2 }
      break
    case 'day5':
      updateData = { day5_data: null, stage: 4 }
      break
  }

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update(updateData)
    .eq('student_id', Number(studentId))
    .eq('session_round', sessionRound)

  if (error) return { error: '처리 중 오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}

// 레거시 — 이전 버전 데이터 호환용, 신규 저장은 saveDay1/23/5 사용
export async function saveExperiences(
  sessionRound: number,
  experiences: Record<string, string>
) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('cc_student_id')?.value
  if (!studentId) return { error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .upsert(
      {
        student_id: Number(studentId),
        session_round: sessionRound,
        common_experiences: experiences,
      },
      { onConflict: 'student_id,session_round' }
    )

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/student')
  return { success: true }
}
