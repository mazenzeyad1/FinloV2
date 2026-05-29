import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogin } from '../../hooks/useAuth'

export function LoginPage() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <div className="min-h-screen bg-[#F6F5F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-2xl font-semibold text-text-1 tracking-tight">finlo</span>
        </div>

        <div className="card p-8">
          <h1 className="text-[20px] font-semibold text-text-1 mb-1">Welcome back</h1>
          <p className="text-[13px] text-text-2 mb-6">Sign in to your Finlo account</p>

          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="block text-[12px] font-medium text-text-2 mb-1.5">
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-text-2">Password</label>
                <Link to="/forgot-password" className="text-[12px] text-primary">
                  Forgot password?
                </Link>
              </div>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {login.isError && (
              <p className="text-[12px] text-danger mb-4 bg-red-50 px-3 py-2 rounded-[8px]">
                Invalid email or password. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="btn btn-primary w-full btn-lg"
            >
              {login.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-[12px] text-text-3 text-center mt-5">
            No account?{' '}
            <Link to="/register" className="text-primary font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
