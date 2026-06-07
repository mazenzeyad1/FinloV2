import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useUpdateProfile, useChangePassword, useChangeEmail, useDeleteAccount } from '../../hooks/useUsers'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-text-2 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const nav = useNavigate()

  // Profile
  const updateProfile = useUpdateProfile()
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [profileMsg, setProfileMsg] = useState('')

  // Password
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')

  // Email
  const changeEmail = useChangeEmail()
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Delete
  const deleteAccount = useDeleteAccount()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg('')
    updateProfile.mutate(
      { firstName, lastName },
      { onSuccess: () => setProfileMsg('Saved') },
    )
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match'); return }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => { logout(); nav('/login') },
        onError: (err: any) => setPwError(err?.message ?? 'Could not change password'),
      },
    )
  }

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    changeEmail.mutate(
      { newEmail, currentPassword: emailPassword },
      {
        onSuccess: () => { setEmailSent(true); setEmailPassword('') },
        onError: (err: any) => setEmailError(err?.message ?? 'Could not change email'),
      },
    )
  }

  const submitDelete = () => {
    setDeleteError('')
    deleteAccount.mutate(
      { password: deletePassword },
      {
        onSuccess: () => { logout(); nav('/login') },
        onError: (err: any) => setDeleteError(err?.message ?? 'Could not delete account'),
      },
    )
  }

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-[22px] font-semibold text-text-1">Settings</h1>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card p-6 space-y-4">
        <h2 className="text-[15px] font-semibold text-text-1">Profile</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last name">
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={updateProfile.isPending} className="btn btn-primary">
            {updateProfile.isPending ? 'Saving...' : 'Save changes'}
          </button>
          {profileMsg && <span className="text-[12px] text-success">{profileMsg}</span>}
          {updateProfile.isError && <span className="text-[12px] text-danger">Could not save</span>}
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={submitPassword} className="card p-6 space-y-4">
        <h2 className="text-[15px] font-semibold text-text-1">Change password</h2>
        <p className="text-[12px] text-text-3 -mt-2">You'll be signed out of all devices and need to sign in again.</p>
        <Field label="Current password">
          <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </Field>
        <Field label="New password">
          <input className="input" type="password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
        </Field>
        {pwError && <p className="text-[12px] text-danger">{pwError}</p>}
        <button type="submit" disabled={changePassword.isPending} className="btn btn-primary">
          {changePassword.isPending ? 'Updating...' : 'Update password'}
        </button>
      </form>

      {/* Change email */}
      <form onSubmit={submitEmail} className="card p-6 space-y-4">
        <h2 className="text-[15px] font-semibold text-text-1">Change email</h2>
        <p className="text-[12px] text-text-3 -mt-2">Current: <span className="font-medium text-text-2">{user?.email}</span></p>
        {emailSent ? (
          <p className="text-[13px] text-success bg-green-50 px-3 py-2 rounded-[8px]">
            Confirmation link sent. Open it from your new inbox to finish the change.
          </p>
        ) : (
          <>
            <Field label="New email">
              <input className="input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </Field>
            <Field label="Current password">
              <input className="input" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} required />
            </Field>
            {emailError && <p className="text-[12px] text-danger">{emailError}</p>}
            <button type="submit" disabled={changeEmail.isPending} className="btn btn-primary">
              {changeEmail.isPending ? 'Sending...' : 'Send confirmation'}
            </button>
          </>
        )}
      </form>

      {/* Danger zone */}
      <div className="card p-6 space-y-4 border-danger/30">
        <h2 className="text-[15px] font-semibold text-danger">Delete account</h2>
        <p className="text-[12px] text-text-3 -mt-2">Permanently deletes your account and all data. This cannot be undone.</p>
        {!confirmingDelete ? (
          <button onClick={() => setConfirmingDelete(true)} className="btn bg-danger text-white hover:bg-danger/90">Delete account</button>
        ) : (
          <div className="space-y-3">
            <Field label="Enter your password to confirm">
              <input className="input" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            </Field>
            {deleteError && <p className="text-[12px] text-danger">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={submitDelete} disabled={deleteAccount.isPending || !deletePassword} className="btn bg-danger text-white hover:bg-danger/90">
                {deleteAccount.isPending ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button onClick={() => { setConfirmingDelete(false); setDeletePassword(''); setDeleteError('') }} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
