import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useResetPassword } from '../../hooks/useAuth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const reset = useResetPassword()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    reset.mutate(
      { token, password },
      {
        onSuccess: () => setDone(true),
        onError: (err: any) => setError(err?.message ?? 'Reset link is invalid or has expired.'),
      },
    )
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
          {done ? (
            <div className="text-center">
              <h1 className="text-[18px] font-semibold text-text-1 mb-2">Password reset</h1>
              <p className="text-[13px] text-text-2">Your password has been updated. You can now sign in.</p>
              <Link to="/login" className="btn btn-primary w-full mt-6 btn-lg">Sign in</Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <h1 className="text-[18px] font-semibold text-text-1 mb-2">Invalid link</h1>
              <p className="text-[13px] text-text-2">This reset link is missing or malformed. Request a new one.</p>
              <Link to="/forgot-password" className="btn btn-primary w-full mt-6 btn-lg">Request new link</Link>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold text-text-1 mb-1">Set a new password</h1>
              <p className="text-[13px] text-text-2 mb-6">Choose a password at least 8 characters long.</p>

              <form onSubmit={submit}>
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-text-2 mb-1.5">New password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[12px] font-medium text-text-2 mb-1.5">Confirm password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {error && (
                  <p className="text-[12px] text-danger mb-4 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>
                )}

                <button type="submit" disabled={reset.isPending} className="btn btn-primary w-full btn-lg">
                  {reset.isPending ? 'Resetting...' : 'Reset password'}
                </button>
              </form>

              <p className="text-[12px] text-text-3 text-center mt-5">
                <Link to="/login" className="text-primary font-medium">Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
