import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getStudentResponse } from '@/app/actions/checklist'
import CompetencyChecklist from '@/components/student/CompetencyChecklist'

export default async function StudentPage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cc_role')?.value
  const studentId = cookieStore.get('cc_student_id')?.value
  const studentName = cookieStore.get('cc_student_name')?.value

  if (role !== 'student' || !studentId) redirect('/')

  const sessionRound = 1

  const response = await getStudentResponse(sessionRound)
  const initialAnswers: Record<string, number> =
    (response?.competency_answers as Record<string, number>) ?? {}

  return (
    <CompetencyChecklist
      initialAnswers={initialAnswers}
      sessionRound={sessionRound}
      studentName={studentName ?? ''}
    />
  )
}
