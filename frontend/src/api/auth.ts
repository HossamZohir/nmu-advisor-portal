import api from './client'

export interface User {
  user_id: string
  name_ar: string
  name_en: string
  role: string
  department_id: string | null
  access_token: string
}

export const login = async (email: string, password: string): Promise<User> => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}