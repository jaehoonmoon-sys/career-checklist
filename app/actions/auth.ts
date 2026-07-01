'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient, supabase } from '@/lib/supabase'

const COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30일
  sameSite: 'lax' as const,
}

// 수강생 로그인
export async function loginAsStudent(studentId: number, studentName: string) {
  const adminClient = createAdminClient()

  // 로그인 이력 기록
  await adminClient.from('cc_login_logs').insert({
    login_type: 'student',
    student_id: studentId,
    admin_id: null,
  })

  const cookieStore = await cookies()
  cookieStore.set('cc_role', 'student', COOKIE_OPTS)
  cookieStore.set('cc_student_id', String(studentId), COOKIE_OPTS)
  cookieStore.set('cc_student_name', studentName, COOKIE_OPTS)

  redirect('/student')
}

// 관리자 로그인
export async function loginAsAdmin(password: string) {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: '비밀번호가 올바르지 않습니다.' }
  }

  const adminClient = createAdminClient()

  const { data: admin } = await adminClient
    .from('cc_admins')
    .select('id')
    .eq('username', 'admin')
    .single()

  if (admin) {
    await adminClient.from('cc_login_logs').insert({
      login_type: 'admin',
      student_id: null,
      admin_id: admin.id,
    })
  }

  const cookieStore = await cookies()
  cookieStore.set('cc_role', 'admin', COOKIE_OPTS)

  redirect('/admin')
}

// 수강생 목록 조회 (기수별)
export async function getStudentsByCohort(cohort: string) {
  const { data, error } = await supabase
    .from('dm5_students')
    .select('id, student_name')
    .eq('cohort', cohort)
    .eq('is_active', true)
    .order('student_name')

  if (error) return []
  return data ?? []
}

// 기수 목록 조회
export async function getCohorts() {
  const { data, error } = await supabase
    .from('dm5_students')
    .select('cohort')
    .eq('is_active', true)
    .not('cohort', 'is', null)

  if (error) return []

  const unique = [...new Set((data ?? []).map((r) => r.cohort))].sort()
  return unique
}
