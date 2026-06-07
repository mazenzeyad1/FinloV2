import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth.store'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailChangePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error')
  const logout = useAuthStore((s) => s.logout)
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true // guard against StrictMode double-invoke (token is single-use)
    api
      .get('/auth/verify-email-change', { params: { token } })
      .then(() => { setStatus('success'); logout() }) // email changed — force a fresh sign-in
      .catch(() => setStatus('error'))
  }, [token, logout])

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

        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-[18px] font-semibold text-text-1 mb-1">Confirming your new email…</h1>
              <p className="text-[13px] text-text-2">Hang tight, this only takes a second.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-[18px] font-semibold text-text-1 mb-2">Email updated</h1>
              <p className="text-[13px] text-text-2">Your email address has been changed. Please sign in with it.</p>
              <Link to="/login" className="btn btn-primary w-full mt-6 btn-lg">Sign in</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-[18px] font-semibold text-text-1 mb-2">Couldn't update email</h1>
              <p className="text-[13px] text-text-2">This link is invalid or has expired. Try requesting the change again from Settings.</p>
              <Link to="/login" className="btn btn-primary w-full mt-6 btn-lg">Back to login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
