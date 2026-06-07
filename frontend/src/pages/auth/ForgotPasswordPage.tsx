import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForgotPassword } from '../../hooks/useAuth'

export function ForgotPasswordPage() {
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    forgot.mutate({ email }, { onSuccess: () => setSubmitted(true) })
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
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 className="text-[18px] font-semibold text-text-1 mb-2">Check your email</h1>
              <p className="text-[13px] text-text-2">
                If an account exists for <span className="font-medium text-text-1">{email}</span>, we've sent a link to reset your password. It expires in 1 hour.
              </p>
              <Link to="/login" className="btn btn-primary w-full mt-6 btn-lg">Back to login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold text-text-1 mb-1">Forgot password?</h1>
              <p className="text-[13px] text-text-2 mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={submit}>
                <div className="mb-6">
                  <label className="block text-[12px] font-medium text-text-2 mb-1.5">Email address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {forgot.isError && (
                  <p className="text-[12px] text-danger mb-4 bg-red-50 px-3 py-2 rounded-[8px]">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button type="submit" disabled={forgot.isPending} className="btn btn-primary w-full btn-lg">
                  {forgot.isPending ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p className="text-[12px] text-text-3 text-center mt-5">
                Remember it?{' '}
                <Link to="/login" className="text-primary font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
