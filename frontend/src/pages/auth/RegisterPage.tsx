import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegister } from '../../hooks/useAuth'

export function RegisterPage() {
  const register = useRegister()
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

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
          <h1 className="text-[20px] font-semibold text-text-1 mb-1">Create your account</h1>
          <p className="text-[13px] text-text-2 mb-6">
            Start managing your finances for free
          </p>

          <form onSubmit={(e) => { e.preventDefault(); register.mutate(form) }}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[12px] font-medium text-text-2 mb-1.5">
                  First name
                </label>
                <input
                  className="input"
                  placeholder="Mazen"
                  value={form.firstName}
                  onChange={set('firstName')}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-text-2 mb-1.5">
                  Last name
                </label>
                <input
                  className="input"
                  placeholder="Z"
                  value={form.lastName}
                  onChange={set('lastName')}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-medium text-text-2 mb-1.5">
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-[12px] font-medium text-text-2 mb-1.5">
                Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
            </div>

            {register.isError && (
              <p className="text-[12px] text-danger mb-4 bg-red-50 px-3 py-2 rounded-[8px]">
                Something went wrong. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={register.isPending}
              className="btn btn-primary w-full btn-lg"
            >
              {register.isPending ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-[12px] text-text-3 text-center mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
