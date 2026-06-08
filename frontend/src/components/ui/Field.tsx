import { useId } from 'react'

interface FieldProps {
  label: string
  hint?: string
  /** Receives a generated id to wire onto the control via `id={id}`. */
  children: (id: string) => React.ReactNode
}

/**
 * Wraps a form control with a programmatically-associated <label>.
 * Usage: <Field label="Amount">{(id) => <input id={id} className="input" />}</Field>
 */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-[11px] text-text-3 font-medium mb-1 block">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[11px] text-text-4 mt-1">{hint}</p>}
    </div>
  )
}
