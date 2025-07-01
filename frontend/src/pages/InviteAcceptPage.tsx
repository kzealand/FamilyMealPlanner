import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { familyAPI } from '@/services/api'
import Register from './Register'
import Login from './Login'
import Button from '@/components/ui/Button'

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading, login } = useAuth()
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [registerMode, setRegisterMode] = useState(false)
  const [registerEmail, setRegisterEmail] = useState('')
  const [accepting, setAccepting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    familyAPI.getInvitation(token)
      .then(res => {
        setInvitation(res.invitation)
        setRegisterEmail(res.invitation.email)
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Invalid or expired invitation')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    if (!user) return
    setAccepting(true)
    setError('')
    try {
      await familyAPI.acceptInvitation(token!, user.id)
      setSuccess('Invitation accepted! Redirecting...')
      setTimeout(() => navigate('/family'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>
  }

  if (success) {
    return <div className="min-h-screen flex items-center justify-center text-green-600">{success}</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">You're invited!</h1>
        <p className="mb-4">{invitation.email} is invited to join <span className="font-semibold">{invitation.family_name}</span> as <span className="font-semibold">{invitation.role}</span>.</p>
        {invitation.message && <p className="mb-4 italic">"{invitation.message}"</p>}
        {!user && !registerMode && (
          <>
            <p className="mb-4">To accept this invitation, please register or log in with <span className="font-mono">{invitation.email}</span>.</p>
            <div className="flex gap-2">
              <Button onClick={() => setRegisterMode(true)} className="w-1/2">Register</Button>
              <Button onClick={() => navigate('/login')} className="w-1/2" variant="outline">Log In</Button>
            </div>
          </>
        )}
        {!user && registerMode && (
          <div>
            <Register prefillEmail={registerEmail} disableEmail />
            <Button onClick={() => setRegisterMode(false)} variant="outline" className="mt-2 w-full">Back</Button>
          </div>
        )}
        {user && user.email === invitation.email && (
          <div>
            <Button onClick={handleAccept} className="w-full" disabled={accepting}>{accepting ? 'Accepting...' : 'Accept Invitation'}</Button>
          </div>
        )}
        {user && user.email !== invitation.email && (
          <div className="text-red-600">You are logged in as <span className="font-mono">{user.email}</span>, but this invitation is for <span className="font-mono">{invitation.email}</span>. Please log out and register or log in with the correct email.</div>
        )}
      </div>
    </div>
  )
} 