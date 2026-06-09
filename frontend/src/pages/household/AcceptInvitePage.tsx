import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HomeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useAcceptInvite } from '../../hooks/useHousehold'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const accept = useAcceptInvite()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid invite link — no token found.')
      return
    }

    setStatus('loading')
    accept.mutate(token, {
      onSuccess: (data) => {
        setStatus('success')
        setMessage(data.message ?? 'You have joined the household!')
        setTimeout(() => navigate('/household'), 2500)
      },
      onError: (err: any) => {
        setStatus('error')
        const msg = err?.message ?? 'Failed to accept invite'
        // If unauthenticated, redirect to login with return URL
        if (err?.status === 401) {
          navigate(`/login?redirect=/household/accept?token=${token}`)
          return
        }
        setMessage(msg)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="card p-8 max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <HomeIcon className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-xl font-bold text-text-primary">Household Invite</h1>

        {(status === 'idle' || status === 'loading') && (
          <>
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary">Accepting your invitation…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-text-primary font-medium">{message}</p>
            <p className="text-sm text-text-secondary">Redirecting you to your household…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircleIcon className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-text-primary font-medium">Something went wrong</p>
            <p className="text-sm text-text-secondary">{message}</p>
            <button className="btn-primary mt-2" onClick={() => navigate('/household')}>
              Go to Household
            </button>
          </>
        )}
      </div>
    </div>
  )
}
