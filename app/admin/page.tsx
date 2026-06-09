import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cc_role')?.value

  if (role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 text-sm mb-2">관리자 모드</p>
        <h1 className="text-2xl font-bold text-slate-900">전체 수강생 현황</h1>
        <p className="text-slate-400 text-sm mt-4">관리자 화면 준비 중...</p>
      </div>
    </div>
  )
}
