'use server'

import { createAdminClient } from '@/lib/supabase'
import { calcJobScores, calcMaxScores, type JobType } from '@/lib/survey-questions'
import { type ExperienceData } from '@/lib/types'

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
      .select('student_id, competency_answers, common_experiences, updated_at')
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
    }
  })
}
