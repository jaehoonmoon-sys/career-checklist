'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, supabase } from '@/lib/supabase'
import { calcJobScores, calcMaxScores, type JobType } from '@/lib/survey-questions'
import { type ExperienceData, type Day1Data, type Day23Data, type Day5Data } from '@/lib/types'
import { getEffectiveConfig, type FormConfig } from '@/lib/form-config'

const MAX_SCORES = calcMaxScores()
const JOB_KEYS: JobType[] = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']

export type StudentRow = {
  id: number
  student_name: string
  cohort: string
  completed: boolean
  top_job: JobType | null
  job_pcts: Record<JobType, number>
  answers: Record<string, number>
  answered_count: number
  updated_at: string | null
  experiences: Partial<ExperienceData> | null
  stage: number
  tutor_comment_1: string | null
  tutor_comment_2: string | null
  day1_data: Partial<Day1Data> | null
  day23_data: Partial<Day23Data> | null
  day5_data: Partial<Day5Data> | null
}

const EMPTY_PCTS: Record<JobType, number> = {
  performance: 0, content: 0, brand: 0, growth: 0, crm: 0, ae: 0,
}

export async function getAdminOverview(): Promise<StudentRow[]> {
  const adminClient = createAdminClient()

  const [{ data: students }, { data: responses }] = await Promise.all([
    adminClient
      .from('mj_students')
      .select('id, student_name, cohort')
      .eq('is_active', true)
      .order('student_name'),
    adminClient
      .from('cc_checklist_responses')
      .select(
        'student_id, competency_answers, common_experiences, updated_at, stage, tutor_comment_1, tutor_comment_2, day1_data, day23_data, day5_data'
      )
      .eq('session_round', 1),
  ])

  const responseMap = new Map(
    (responses ?? []).map(r => [r.student_id, r])
  )

  return (students ?? []).map(s => {
    const resp = responseMap.get(s.id)
    const answers = (resp?.competency_answers as Record<string, number>) ?? {}
    const answered_count = Object.keys(answers).length

    const experiences = (resp?.common_experiences as Partial<ExperienceData>) ?? null
    const hasExperiences = experiences && Object.values(experiences).some(v => v && String(v).trim())

    const day1_data = (resp?.day1_data as Partial<Day1Data>) ?? null
    const day23_data = (resp?.day23_data as Partial<Day23Data>) ?? null
    const day5_data = (resp?.day5_data as Partial<Day5Data>) ?? null

    if (answered_count === 0) {
      return {
        id: s.id,
        student_name: s.student_name ?? '',
        cohort: s.cohort ?? '',
        completed: false,
        top_job: null,
        job_pcts: { ...EMPTY_PCTS },
        answers: {},
        answered_count: 0,
        updated_at: resp?.updated_at ?? null,
        experiences: hasExperiences ? experiences : null,
        stage: resp?.stage ?? 0,
        tutor_comment_1: resp?.tutor_comment_1 ?? null,
        tutor_comment_2: resp?.tutor_comment_2 ?? null,
        day1_data,
        day23_data,
        day5_data,
      }
    }

    const scores = calcJobScores(answers)
    const job_pcts = JOB_KEYS.reduce((acc, job) => ({
      ...acc,
      [job]: Math.max(0, Math.round((scores[job] / MAX_SCORES[job]) * 100)),
    }), {} as Record<JobType, number>)
    const top_job = JOB_KEYS.reduce((a, b) => scores[a] >= scores[b] ? a : b)

    return {
      id: s.id,
      student_name: s.student_name ?? '',
      cohort: s.cohort ?? '',
      completed: true,
      top_job,
      job_pcts,
      answers,
      answered_count,
      updated_at: resp?.updated_at ?? null,
      experiences: hasExperiences ? experiences : null,
      stage: resp?.stage ?? 0,
      tutor_comment_1: resp?.tutor_comment_1 ?? null,
      tutor_comment_2: resp?.tutor_comment_2 ?? null,
      day1_data,
      day23_data,
      day5_data,
    }
  })
}

export async function getFormConfig(): Promise<FormConfig> {
  const { data } = await supabase
    .from('cc_form_config')
    .select('config')
    .eq('id', 1)
    .single()

  return getEffectiveConfig((data?.config as Record<string, unknown>) ?? {})
}

export async function saveFormConfig(config: FormConfig): Promise<{ success?: boolean; error?: string }> {
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('cc_form_config')
    .upsert({ id: 1, config, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true }
}

export async function saveTutorComment(
  studentId: number,
  sessionRound: number,
  commentNum: 1 | 2,
  comment: string,
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()

  const field = commentNum === 1 ? 'tutor_comment_1' : 'tutor_comment_2'
  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ [field]: comment.trim() })
    .eq('student_id', studentId)
    .eq('session_round', sessionRound)

  if (error) return { success: false, error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  return { success: true }
}

export async function publishTutorComment(
  studentId: number,
  sessionRound: number,
  commentNum: 1 | 2,
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()

  const targetStage = commentNum === 1 ? 2 : 4
  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: targetStage })
    .eq('student_id', studentId)
    .eq('session_round', sessionRound)
    .lt('stage', targetStage)

  if (error) return { success: false, error: '공개 처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true }
}

export async function unpublishTutorComment(
  studentId: number,
  sessionRound: number,
  commentNum: 1 | 2,
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()

  const prevStage = commentNum === 1 ? 1 : 3
  const exactStage = commentNum === 1 ? 2 : 4
  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: prevStage })
    .eq('student_id', studentId)
    .eq('session_round', sessionRound)
    .eq('stage', exactStage)

  if (error) return { success: false, error: '숨김 처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true }
}
