import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminOverview, getFormConfig } from '@/app/actions/admin'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const role = cookieStore.get('cc_role')?.value

  if (role !== 'admin') redirect('/')

  const [students, formConfig] = await Promise.all([
    getAdminOverview(),
    getFormConfig(),
  ])

  return <AdminDashboard students={students} formConfig={formConfig} />
}
