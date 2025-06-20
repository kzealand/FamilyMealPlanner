import { useState, useEffect } from 'react'
import { familyAPI } from '@/services/api'
import type { Family, FamilyMember } from '@/types'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

interface FamilyWithMembers extends Family {
  members?: FamilyMember[]
  created_by?: string
}

export default function Family() {
  const { user } = useAuth()
  const [families, setFamilies] = useState<FamilyWithMembers[]>([])
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [createFormData, setCreateFormData] = useState({ name: '', description: '' })
  const [addMemberData, setAddMemberData] = useState({ email: '', role: 'member' })
  const [inviteData, setInviteData] = useState({ email: '', role: 'member', message: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [invitations, setInvitations] = useState<any[]>([])

  useEffect(() => {
    loadFamilies()
  }, [])

  const loadFamilies = async () => {
    try {
      setLoading(true)
      const familiesData = await familyAPI.getAll()
      setFamilies(familiesData)
      if (familiesData.length > 0 && !selectedFamily) {
        setSelectedFamily(familiesData[0])
      }
    } catch (err) {
      setError('Failed to load families')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadFamilyDetails = async (familyId: string) => {
    try {
      const { family, members } = await familyAPI.getById(familyId)
      const familyWithMembers = { ...family, members }
      setSelectedFamily(familyWithMembers)
      
      // Update the family in the list
      setFamilies(prev => prev.map(f => 
        f.id === familyId ? familyWithMembers : f
      ))

      // Load invitations if user is admin
      if (familyWithMembers.members?.some(m => m.id === user?.id && m.role === 'admin')) {
        loadInvitations(familyId)
      }
    } catch (err) {
      setError('Failed to load family details')
      console.error(err)
    }
  }

  const loadInvitations = async (familyId: string) => {
    try {
      const invitationsData = await familyAPI.getInvitations(familyId)
      setInvitations(invitationsData)
    } catch (err) {
      console.error('Failed to load invitations:', err)
    }
  }

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      const newFamily = await familyAPI.create(createFormData)
      setFamilies(prev => [newFamily, ...prev])
      setSelectedFamily(newFamily)
      setShowCreateForm(false)
      setCreateFormData({ name: '', description: '' })
      setSuccess('Family created successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create family')
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFamily) return

    try {
      setError('')
      const updatedMembers = await familyAPI.addMember(selectedFamily.id, addMemberData)
      setSelectedFamily(prev => prev ? { ...prev, members: updatedMembers } : null)
      setShowAddMemberForm(false)
      setAddMemberData({ email: '', role: 'member' })
      setSuccess('Member added successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedFamily) return

    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      setError('')
      await familyAPI.removeMember(selectedFamily.id, userId)
      await loadFamilyDetails(selectedFamily.id)
      setSuccess('Member removed successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!selectedFamily) return

    try {
      setError('')
      await familyAPI.updateMemberRole(selectedFamily.id, userId, newRole)
      await loadFamilyDetails(selectedFamily.id)
      setSuccess('Member role updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update member role')
    }
  }

  const handleLeaveFamily = async () => {
    if (!selectedFamily) return

    if (!confirm('Are you sure you want to leave this family?')) return

    try {
      setError('')
      await familyAPI.leave(selectedFamily.id)
      await loadFamilies()
      setSelectedFamily(null)
      setSuccess('Successfully left the family!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to leave family')
    }
  }

  const handleDeleteFamily = async () => {
    if (!selectedFamily) return

    if (!confirm('Are you sure you want to delete this family? This action cannot be undone and will delete all associated recipes, meal plans, and shopping lists.')) return

    try {
      setError('')
      await familyAPI.delete(selectedFamily.id)
      await loadFamilies()
      setSelectedFamily(null)
      setSuccess('Family deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete family')
    }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFamily) return

    try {
      setError('')
      const invitation = await familyAPI.inviteMember(selectedFamily.id, inviteData)
      setShowInviteForm(false)
      setInviteData({ email: '', role: 'member', message: '' })
      await loadInvitations(selectedFamily.id)
      setSuccess(`Invitation sent to ${invitation.email}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedFamily) return

    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      setError('')
      await familyAPI.cancelInvitation(selectedFamily.id, invitationId)
      await loadInvitations(selectedFamily.id)
      setSuccess('Invitation cancelled successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel invitation')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your family members
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your family members
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          Create New Family
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {families.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No families yet</h3>
          <p className="text-gray-500 mb-4">Create your first family to get started</p>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Family
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Family List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your Families</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {families.map((family) => (
                  <div
                    key={family.id}
                    className={`px-6 py-4 cursor-pointer hover:bg-gray-50 ${
                      selectedFamily?.id === family.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedFamily(family)}
                  >
                    <h4 className="font-medium text-gray-900">{family.name}</h4>
                    {family.description && (
                      <p className="text-sm text-gray-500 mt-1">{family.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Created {new Date(family.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Family Details */}
          <div className="lg:col-span-2">
            {selectedFamily ? (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{selectedFamily.name}</h3>
                      {selectedFamily.description && (
                        <p className="text-sm text-gray-500 mt-1">{selectedFamily.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddMemberForm(true)}
                      >
                        Add Member
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleLeaveFamily}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Leave Family
                      </Button>
                      {selectedFamily.created_by === user?.id && (
                        <Button
                          variant="outline"
                          onClick={handleDeleteFamily}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Delete Family
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">Family Management</h4>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddMemberForm(true)}
                      >
                        Add Member
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInviteForm(true)}
                      >
                        Send Invitation
                      </Button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('members')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'members'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Members ({selectedFamily.members?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTab('invitations')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'invitations'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Invitations ({invitations.length})
                      </button>
                    </nav>
                  </div>

                  {/* Members Tab */}
                  {activeTab === 'members' && (
                    <div>
                      {selectedFamily.members && selectedFamily.members.length > 0 ? (
                        <div className="space-y-3">
                          {selectedFamily.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {member.first_name?.[0]}{member.last_name?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {member.first_name} {member.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  disabled={member.role === 'admin' && selectedFamily.members?.filter(m => m.role === 'admin').length === 1}
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No members found</p>
                      )}
                    </div>
                  )}

                  {/* Invitations Tab */}
                  {activeTab === 'invitations' && (
                    <div>
                      {invitations.length > 0 ? (
                        <div className="space-y-3">
                          {invitations.map((invitation) => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{invitation.email}</p>
                                <p className="text-sm text-gray-500">
                                  Role: {invitation.role} • Sent {new Date(invitation.created_at).toLocaleDateString()}
                                </p>
                                {invitation.message && (
                                  <p className="text-sm text-gray-600 mt-1">"{invitation.message}"</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  invitation.status === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {invitation.status}
                                </span>
                                {invitation.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No pending invitations</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">Select a family to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Family Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Family</h3>
            <form onSubmit={handleCreateFamily}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Family Name
                  </label>
                  <input
                    type="text"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Family
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Family Member</h3>
            <form onSubmit={handleAddMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={addMemberData.email}
                    onChange={(e) => setAddMemberData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={addMemberData.role}
                    onChange={(e) => setAddMemberData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddMemberForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Add Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Invitation Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Send Family Invitation</h3>
            <form onSubmit={handleSendInvitation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message (optional)
                  </label>
                  <textarea
                    value={inviteData.message}
                    onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add a personal message to your invitation..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 