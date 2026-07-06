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
      .from('dm5_students')
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
    const top_job = JOB_KEYS.reduce((a, b) =>
      Math.max(0, scores[a] / MAX_SCORES[a]) >= Math.max(0, scores[b] / MAX_SCORES[b]) ? a : b
    )

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

export async function openDayAccess(
  studentId: number,
  sessionRound: number,
  day: '23' | '5',
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()
  const targetStage = day === '23' ? 2 : 4

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: targetStage })
    .eq('student_id', studentId)
    .eq('session_round', sessionRound)
    .lt('stage', targetStage)

  if (error) return { success: false, error: '처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true }
}

export async function closeDayAccess(
  studentId: number,
  sessionRound: number,
  day: '23' | '5',
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()
  const exactStage = day === '23' ? 2 : 4
  const prevStage = day === '23' ? 1 : 3

  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: prevStage })
    .eq('student_id', studentId)
    .eq('session_round', sessionRound)
    .eq('stage', exactStage)

  if (error) return { success: false, error: '처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true }
}

export async function setDayGlobalAccess(
  day: '23' | '5',
  open: boolean,
): Promise<{ success?: boolean; error?: string }> {
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('cc_form_config')
    .select('config')
    .eq('id', 1)
    .single()

  const currentConfig = (existing?.config as Record<string, unknown>) ?? {}
  const field = day === '23' ? 'day23_globally_open' : 'day5_globally_open'
  const updatedConfig = { ...currentConfig, [field]: open }

  const { error } = await adminClient
    .from('cc_form_config')
    .upsert({ id: 1, config: updatedConfig, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (error) return { error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true }
}

const CH5_COURSE_NAMES: Record<number, string> = {
  309: '광고 캠페인의 이해',
  319: '성과측정 방법론',
}
const CH5_COURSE_IDS = [309, 319] as const

export type Ch5CourseProgress = {
  course_id: number
  course_name: string
  progress_rate: number
  is_completed: boolean
  synced_at: string | null
}

export type Ch5ProgressRow = {
  student_id: number
  student_name: string
  courses: Ch5CourseProgress[]
  avg_progress: number
}

export async function getCh5Progress(): Promise<Ch5ProgressRow[]> {
  const adminClient = createAdminClient()

  const [{ data: students }, { data: progress }] = await Promise.all([
    adminClient
      .from('dm5_students')
      .select('id, student_name')
      .eq('is_active', true)
      .order('student_name'),
    adminClient
      .from('dm5_lecture_progress')
      .select('student_id, course_id, progress_rate, is_completed, synced_at')
      .in('course_id', CH5_COURSE_IDS),
  ])

  const progressMap = new Map<number, Map<number, { progress_rate: number; is_completed: boolean; synced_at: string | null }>>()
  for (const p of progress ?? []) {
    if (!progressMap.has(p.student_id)) progressMap.set(p.student_id, new Map())
    progressMap.get(p.student_id)!.set(p.course_id, {
      progress_rate: Number(p.progress_rate),
      is_completed: p.is_completed,
      synced_at: p.synced_at,
    })
  }

  return (students ?? []).map(s => {
    const courseMap = progressMap.get(s.id)
    const courses: Ch5CourseProgress[] = CH5_COURSE_IDS.map(courseId => {
      const cp = courseMap?.get(courseId)
      return {
        course_id: courseId,
        course_name: CH5_COURSE_NAMES[courseId],
        progress_rate: cp?.progress_rate ?? 0,
        is_completed: cp?.is_completed ?? false,
        synced_at: cp?.synced_at ?? null,
      }
    })
    const avg_progress = courses.reduce((sum, c) => sum + c.progress_rate, 0) / courses.length
    return {
      student_id: s.id,
      student_name: s.student_name ?? '',
      courses,
      avg_progress,
    }
  })
}

export async function deleteTutorComment(
  studentId: number,
  sessionRound: number,
  commentNum: 1 | 2,
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()

  const field = commentNum === 1 ? 'tutor_comment_1' : 'tutor_comment_2'
  const { error } = await adminClient
    .from('cc_checklist_responses')
    .update({ [field]: null })
    .eq('student_id', studentId)
    .eq('session_round', sessionRound)

  if (error) return { success: false, error: '삭제 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  return { success: true }
}

export async function openDayAccessGlobal(
  day: '23' | '5',
): Promise<{ success: boolean; count?: number; error?: string }> {
  const adminClient = createAdminClient()
  const targetStage = day === '23' ? 2 : 4
  const requiredStage = day === '23' ? 1 : 3

  const { data, error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: targetStage })
    .eq('session_round', 1)
    .eq('stage', requiredStage)
    .select('student_id')

  if (error) return { success: false, error: '처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true, count: (data ?? []).length }
}

export async function closeDayAccessGlobal(
  day: '23' | '5',
): Promise<{ success: boolean; count?: number; error?: string }> {
  const adminClient = createAdminClient()
  const exactStage = day === '23' ? 2 : 4
  const prevStage = day === '23' ? 1 : 3

  const { data, error } = await adminClient
    .from('cc_checklist_responses')
    .update({ stage: prevStage })
    .eq('session_round', 1)
    .eq('stage', exactStage)
    .select('student_id')

  if (error) return { success: false, error: '처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/student')
  return { success: true, count: (data ?? []).length }
}

export type QuizStudentRow = {
  student_id: number
  student_name: string
  total_score: number
  q01: boolean; q02: boolean; q03: boolean; q04: boolean
  q05: boolean; q06: boolean; q07: boolean; q08: boolean
  q09: boolean; q10: boolean; q11: boolean; q12: boolean
  submitted_at: string | null
}

export async function getQuizResults(): Promise<QuizStudentRow[]> {
  const adminClient = createAdminClient()

  const [{ data: students }, { data: results }] = await Promise.all([
    adminClient
      .from('dm5_students')
      .select('id, student_name')
      .eq('is_active', true)
      .order('student_name'),
    adminClient
      .from('dm5_quiz_results')
      .select('student_id, total_score, q01, q02, q03, q04, q05, q06, q07, q08, q09, q10, q11, q12, submitted_at'),
  ])

  const resultMap = new Map((results ?? []).map(r => [r.student_id, r]))

  return (students ?? []).map(s => {
    const r = resultMap.get(s.id)
    return {
      student_id: s.id,
      student_name: s.student_name ?? '',
      total_score: r?.total_score ?? -1,
      q01: r?.q01 ?? false, q02: r?.q02 ?? false,
      q03: r?.q03 ?? false, q04: r?.q04 ?? false,
      q05: r?.q05 ?? false, q06: r?.q06 ?? false,
      q07: r?.q07 ?? false, q08: r?.q08 ?? false,
      q09: r?.q09 ?? false, q10: r?.q10 ?? false,
      q11: r?.q11 ?? false, q12: r?.q12 ?? false,
      submitted_at: r?.submitted_at ?? null,
    }
  })
}
