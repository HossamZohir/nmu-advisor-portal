import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import api from '../api/client'

interface User {
  id: string
  name_en: string
  name_ar: string
  email: string
  role: string
  is_active: boolean
  department_name: string | null
}

const roleColors: Record<string, { color: string; bg: string; border: string }> = {
  dean: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  dept_admin: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  advisor: { color: '#8B141E', bg: '#fdf2f3', border: '#fecdd3' },
}

export default function UserManagement() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name_en: '',
    name_ar: '',
    email: '',
    password: '',
    role: 'advisor',
    department_id: '',
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const usersRes = await api.get('/users')
      setUsers(usersRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ name_en: '', name_ar: '', email: '', password: '', role: 'advisor', department_id: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ name_en: u.name_en, name_ar: u.name_ar, email: u.email, password: '', role: u.role, department_id: '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editUser) {
        const payload: any = { name_en: form.name_en, name_ar: form.name_ar, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        await api.patch(`/users/${editUser.id}`, payload)
      } else {
        if (!form.password) { setError('Password is required'); setSaving(false); return }
        await api.post('/users', form)
      }
      setShowModal(false)
      setSuccess(editUser ? 'User updated successfully' : 'User created successfully')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await api.delete(`/users/${userId}`)
      setSuccess('User deactivated')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to deactivate')
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name_en.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7' }}>

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted hover:text-primary transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Dashboard
            </button>
            <div className="w-px h-5 bg-border" />
            <div>
              <p className="text-text text-sm font-bold">User Management</p>
              <p className="text-muted text-xs">Manage advisors and administrators</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)', boxShadow: '0 4px 15px rgba(139,20,30,0.25)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add User
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Advisors', value: users.filter(u => u.role === 'advisor').length, color: '#8B141E' },
            { label: 'Dept Admins', value: users.filter(u => u.role === 'dept_admin').length, color: '#2563eb' },
            { label: 'Deans', value: users.filter(u => u.role === 'dean').length, color: '#7c3aed' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-border flex items-center justify-between">
              <p className="text-text-2 text-sm font-medium">{stat.label}</p>
              <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search by name or email..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'advisor', 'dept_admin', 'dean'].map(role => (
              <button key={role}
                onClick={() => setFilterRole(role)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all border"
                style={{
                  background: filterRole === role ? '#fdf2f3' : 'white',
                  color: filterRole === role ? '#8B141E' : '#555',
                  borderColor: filterRole === role ? '#8B141E' : '#E5E5E5'
                }}>
                {role === 'all' ? 'All' : role === 'dept_admin' ? 'Dept Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {success && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-4">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">{error}</div>}

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted text-sm">No users found</td></tr>
              ) : filtered.map(u => {
                const rc = roleColors[u.role] || roleColors.advisor
                return (
                  <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
                          {u.name_en.charAt(0)}
                        </div>
                        <div>
                          <p className="text-text text-sm font-semibold">{u.name_en}</p>
                          <p className="text-muted text-xs">{u.name_ar}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-2 text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                        style={{ color: rc.color, background: rc.bg, borderColor: rc.border }}>
                        {u.role === 'dept_admin' ? 'Dept Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)}
                          className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-2 text-xs font-medium transition-colors border border-border">
                          Edit
                        </button>
                        {u.id !== currentUser?.user_id && u.is_active && (
                          <button onClick={() => handleDeactivate(u.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors border border-red-200">
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-text text-lg font-bold">{editUser ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-text transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Full Name (English)', key: 'name_en', placeholder: 'e.g. Ahmed Hassan' },
                { label: 'Full Name (Arabic)', key: 'name_ar', placeholder: 'e.g. أحمد حسن' },
                { label: 'Email', key: 'email', placeholder: 'advisor@nmu.edu.eg' },
                { label: editUser ? 'New Password (leave blank to keep)' : 'Password', key: 'password', placeholder: '••••••••', type: 'password' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-text text-sm font-semibold block mb-2">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              ))}

              <div>
                <label className="text-text text-sm font-semibold block mb-2">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-primary transition-all bg-white">
                  <option value="advisor">Advisor</option>
                  <option value="dept_admin">Dept Admin</option>
                  {currentUser?.role === 'dean' && <option value="dean">Dean</option>}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mt-4">{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-border text-text-2 text-sm font-semibold hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)', opacity: saving ? 0.8 : 1 }}>
                {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}