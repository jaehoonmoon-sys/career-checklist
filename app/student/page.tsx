import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompetencyItems, getStudentResponse } from '@/app/actions/checklist'
import CompetencyChecklist from '@/components/student/CompetencyChecklist'

export default async function StudentPage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cc_role')?.value
  const studentId = cookieStore.get('cc_student_id')?.value
  const studentName = cookieStore.get('cc_student_name')?.value

  if (role !== 'student' || !studentId) redirect('/')

  const sessionRound = 1 // 추후 라운드 선택 기능 추가 예정

  const [items, response] = await Promise.all([
    getCompetencyItems(),
    getStudentResponse(sessionRound),
  ])

  const initialAnswers: Record<string, number> =
    (response?.competency_answers as Record<string, number>) ?? {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <CompetencyChecklist
        items={items}
        initialAnswers={initialAnswers}
        sessionRound={sessionRound}
        studentName={studentName ?? ''}
      />
    </div>
  )
}
