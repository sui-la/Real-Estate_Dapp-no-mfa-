import React, { useState } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

const Profile = () => {
  const { account, formatAddress } = useWeb3()
  const { user, updateProfile, isLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

  React.useEffect(() => {
    if (user?.profile) {
      setFormData({
        name: user.profile.name || '',
        email: user.profile.email || '',
        phone: user.profile.phone || '',
        address: user.profile.address || '',
      })
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      await updateProfile(formData)
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.profile?.name || '',
      email: user?.profile?.email || '',
      phone: user?.profile?.phone || '',
      address: user?.profile?.address || '',
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage your account information and preferences
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="card">
          <div className="flex items-center space-x-6 mb-6">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.profile?.name || 'Anonymous User'}
              </h2>
              <p className="text-gray-600">{formatAddress(account)}</p>
              <p className="text-sm text-gray-500">
                {user?.isAdmin ? 'Administrator' : 'Investor'}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="text-gray-900">{user?.profile?.name || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your email address"
                />
              ) : (
                <p className="text-gray-900">{user?.profile?.email || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="text-gray-900">{user?.profile?.phone || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Enter your address"
                />
              ) : (
                <p className="text-gray-900">{user?.profile?.address || 'Not provided'}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="btn-primary flex items-center"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Wallet Address</span>
              <span className="font-mono text-sm text-gray-900">{formatAddress(account)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Account Type</span>
              <span className="text-gray-900">{user?.isAdmin ? 'Administrator' : 'Investor'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Member Since</span>
              <span className="text-gray-900">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Two-Factor Authentication</span>
              <span className="text-sm text-gray-500">Not available</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Wallet Connection</span>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
