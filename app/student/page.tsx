import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getStudentResponse } from '@/app/actions/checklist'
import { getFormConfig } from '@/app/actions/admin'
import CompetencyChecklist from '@/components/student/CompetencyChecklist'
import CareerJourneyView from '@/components/student/CareerJourneyView'
import { EMPTY_DAY1, EMPTY_DAY23, EMPTY_DAY5, type Day1Data, type Day23Data, type Day5Data, type CurrRow, type WsRow, type WenvRow } from '@/lib/types'
import { calcJobScores, calcMaxScores, type JobType } from '@/lib/survey-questions'

const JOB_KEYS: JobType[] = ['performance', 'content', 'brand', 'growth', 'crm', 'ae']
const MAX_SCORES = calcMaxScores()

export default async function StudentPage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cc_role')?.value
  const studentId = cookieStore.get('cc_student_id')?.value
  const studentName = cookieStore.get('cc_student_name')?.value

  if (role !== 'student' || !studentId) redirect('/')

  const sessionRound = 1

  const [response, formConfig] = await Promise.all([
    getStudentResponse(sessionRound),
    getFormConfig(),
  ])
  const initialAnswers: Record<string, number> =
    (response?.competency_answers as Record<string, number>) ?? {}
  const hasAnswers = Object.keys(initialAnswers).length > 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stage: number = (response as any)?.stage ?? 0

  // stage >= 1이면 커리어 여정 뷰 (체크리스트 이후 단계)
  if (hasAnswers && stage >= 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = response as any
    const day1Data: Day1Data = { ...EMPTY_DAY1, ...(resp?.day1_data ?? {}) }
    const raw23 = (resp?.day23_data as Record<string, unknown>) ?? {}
    const day23Data: Day23Data = {
      ...EMPTY_DAY23,
      ...raw23,
      curriculum:    Array.isArray(raw23.curriculum)    ? raw23.curriculum    as CurrRow[]  : EMPTY_DAY23.curriculum,
      work_style:    Array.isArray(raw23.work_style)    ? raw23.work_style    as WsRow[]    : EMPTY_DAY23.work_style,
      work_env_type: Array.isArray(raw23.work_env_type) ? raw23.work_env_type as WenvRow[]  : EMPTY_DAY23.work_env_type,
      work_env_size: Array.isArray(raw23.work_env_size) ? raw23.work_env_size as WenvRow[]  : EMPTY_DAY23.work_env_size,
    }
    const day5Data: Day5Data = { ...EMPTY_DAY5, ...(resp?.day5_data ?? {}) }

    const scores = calcJobScores(initialAnswers)
    const topJob = JOB_KEYS.reduce((a, b) => scores[a] >= scores[b] ? a : b)
    const topJobPct = Math.max(0, Math.round((scores[topJob] / MAX_SCORES[topJob]) * 100))
    const jobPcts = JOB_KEYS.reduce((acc, job) => ({
      ...acc,
      [job]: Math.max(0, Math.round((scores[job] / MAX_SCORES[job]) * 100)),
    }), {} as Record<JobType, number>)

    return (
      <CareerJourneyView
        stage={stage}
        studentName={studentName ?? ''}
        sessionRound={sessionRound}
        topJob={topJob}
        topJobPct={topJobPct}
        jobPcts={jobPcts}
        answers={initialAnswers}
        day1Data={day1Data}
        day23Data={day23Data}
        day5Data={day5Data}
        tutorComment1={resp?.tutor_comment_1 ?? null}
        tutorComment2={resp?.tutor_comment_2 ?? null}
        formConfig={formConfig}
      />
    )
  }

  // stage=0: 체크리스트 화면 (+ 완료 후 DAY1 폼)
  const initialDay1: Day1Data = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...EMPTY_DAY1, ...((response as any)?.day1_data ?? {}),
  }

  return (
    <CompetencyChecklist
      initialAnswers={initialAnswers}
      initialDay1={initialDay1}
      sessionRound={sessionRound}
      studentName={studentName ?? ''}
      formConfig={formConfig}
    />
  )
}
