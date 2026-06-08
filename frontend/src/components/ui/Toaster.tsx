import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useToastStore, type ToastType } from '../../store/toast.store'

const ICON: Record<ToastType, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
}
const COLOR: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.type]
        return (
          <div
            key={t.id}
            className="card shadow-lg p-3 flex items-start gap-2.5 animate-[toastIn_0.2s_ease]"
            role="status"
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${COLOR[t.type]}`} />
            <p className="text-[13px] text-text-1 flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
              className="text-text-3 hover:text-text-1 transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
