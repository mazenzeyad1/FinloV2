import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useId, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Keep the latest onClose without making it an effect dependency — otherwise
  // an inline onClose (new function each render) would re-run the focus effect
  // on every keystroke and yank focus back to the first field.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    // Remember what had focus so we can restore it on close
    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Move focus into the dialog
    const panel = panelRef.current
    const focusFirst = () => {
      const focusables = panel?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ;(focusables?.[0] ?? panel)?.focus()
    }
    focusFirst()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handler)
    // Lock background scroll while open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
    // Only re-run when the modal opens/closes — NOT when onClose changes identity.
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between p-5 border-b border-black/[0.07]">
          <h2 id={titleId} className="text-[15px] font-semibold text-text-1">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-text-3 hover:text-text-1 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
