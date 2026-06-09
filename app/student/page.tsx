import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function StudentPage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cc_role')?.value
  const studentName = cookieStore.get('cc_student_name')?.value

  if (role !== 'student') redirect('/')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 text-sm mb-2">안녕하세요</p>
        <h1 className="text-2xl font-bold text-slate-900">{studentName}님의 진로 체크리스트</h1>
        <p className="text-slate-400 text-sm mt-4">체크리스트 화면 준비 중...</p>
      </div>
    </div>
  )
}
