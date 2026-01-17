import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { login } from '../api/client'

export default function Login() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(username, password)
      // 保存token和用户信息到localStorage
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      // 跳转到首页
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || t('error.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl dark:opacity-10" style={{ background: 'radial-gradient(circle, rgba(156, 163, 175, 0.1) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl dark:opacity-10" style={{ background: 'radial-gradient(circle, rgba(156, 163, 175, 0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo 和标题 */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gray-900 dark:bg-gray-100 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white dark:text-gray-900" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(-15 14 14)">
                  <rect x="7" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="9" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M7 13C5 12 3 11.5 1 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M7 14.5C5.5 14 4 13.5 2.5 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M7 16C6 15.5 5 15.5 4 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M21 13C23 12 25 11.5 27 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M21 14.5C22.5 14 24 13.5 25.5 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M21 16C22 15.5 23 15.5 24 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.login')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.loginDescription')}
          </p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-gray-200/60 dark:border-gray-700/60">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.username')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all sm:text-sm"
                  placeholder={t('auth.username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all sm:text-sm"
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="text-sm text-red-800 dark:text-red-200">
                  {t(error)}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          BrowserWing © 2025
        </p>
      </div>
    </div>
  )
}
