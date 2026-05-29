import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <div className={`relative bg-white w-full max-w-md h-full shadow-xl flex flex-col
            transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between p-5 border-b border-black/[0.07]">
              <h2 className="text-[15px] font-semibold text-text-1">{title}</h2>
              <button onClick={onClose} className="text-text-3 hover:text-text-1 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </div>
        </div>
      )}
    </>
  )
}
