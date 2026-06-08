import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { useRestoreSession } from './hooks/useRestoreSession'
import { Toaster } from './components/ui/Toaster'
import './index.css'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

function App() {
  useRestoreSession()
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
