'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient, supabase } from '@/lib/supabase'

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
    .select('competency_answers, common_experiences, notes')
    .eq('student_id', Number(studentId))
    .eq('session_round', sessionRound)
    .single()

  return data ?? null
}

export async function saveCompetencyAnswers(
  sessionRound: number,
  competencyAnswers: Record<string, number[]>
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
