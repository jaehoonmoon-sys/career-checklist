'use client'

import { useEffect, useState, useTransition } from 'react'
import { getCohorts, getStudentsByCohort, loginAsAdmin, loginAsStudent } from '@/app/actions/auth'

export default function LoginPage() {
  const [tab, setTab] = useState<'student' | 'admin'>('student')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">진로 체크리스트</h1>
          <p className="text-slate-500 mt-1 text-sm">디지털 마케터 부트캠프 5기</p>
        </div>

        {/* 탭 */}
        <div className="bg-slate-100 rounded-xl p-1 flex mb-6">
          <button
            onClick={() => setTab('student')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === 'student'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            수강생
          </button>
          <button
            onClick={() => setTab('admin')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            관리자
          </button>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {tab === 'student' ? <StudentLoginForm /> : <AdminLoginForm />}
        </div>
      </div>
    </div>
  )
}

function StudentLoginForm() {
  const [cohorts, setCohorts] = useState<string[]>([])
  const [selectedCohort, setSelectedCohort] = useState('')
  const [students, setStudents] = useState<{ id: number; student_name: string }[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getCohorts().then(setCohorts)
  }, [])

  useEffect(() => {
    if (!selectedCohort) return
    setSelectedStudentId(null)
    getStudentsByCohort(selectedCohort).then(setStudents)
  }, [selectedCohort])

  const handleLogin = () => {
    if (!selectedStudentId) return
    const student = students.find((s) => s.id === selectedStudentId)
    if (!student) return
    startTransition(() => {
      loginAsStudent(selectedStudentId, student.student_name ?? '')
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">기수 선택</p>
        <select
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">기수를 선택하세요</option>
          {cohorts.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {students.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">이름 선택</p>
          <select
            value={selectedStudentId ?? ''}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">이름을 선택하세요</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.student_name}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={!selectedStudentId || isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {isPending ? '로그인 중...' : '입장하기'}
      </button>

      <p className="text-xs text-slate-400 text-center">
        기수와 이름을 선택하면 내 체크리스트로 이동합니다
      </p>
    </div>
  )
}

function AdminLoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleLogin = () => {
    setError('')
    startTransition(async () => {
      const result = await loginAsAdmin(password)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">관리자 비밀번호</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="비밀번호 입력"
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <button
        onClick={handleLogin}
        disabled={!password || isPending}
        className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {isPending ? '로그인 중...' : '관리자 로그인'}
      </button>

      <p className="text-xs text-slate-400 text-center">
        전체 수강생 데이터 및 로그인 이력에 접근합니다
      </p>
    </div>
  )
}
