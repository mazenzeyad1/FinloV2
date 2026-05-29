import { useState, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { BanknotesIcon } from '@heroicons/react/24/outline'
import { useCreateLinkToken, useExchangeToken } from '../../hooks/useConnections'

export function PlaidLink() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const createLinkToken = useCreateLinkToken()
  const exchangeToken = useExchangeToken()

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: (publicToken) => {
      exchangeToken.mutate(publicToken)
      setLinkToken(null)
    },
  })

  const handleClick = useCallback(async () => {
    if (linkToken && ready) {
      open()
    } else {
      const data = await createLinkToken.mutateAsync()
      setLinkToken(data.linkToken)
    }
  }, [linkToken, ready, open, createLinkToken])

  // Auto-open once token is ready
  const prevToken = linkToken
  if (linkToken && ready && linkToken === prevToken) {
    open()
  }

  return (
    <button
      onClick={handleClick}
      disabled={createLinkToken.isPending || exchangeToken.isPending}
      className="btn btn-primary"
    >
      <BanknotesIcon className="w-4 h-4" />
      {createLinkToken.isPending || exchangeToken.isPending ? 'Connecting...' : 'Connect bank'}
    </button>
  )
}
