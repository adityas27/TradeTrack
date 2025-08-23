import React, { useEffect, useState } from 'react';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/accounts/me/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-lg mx-auto bg-white shadow-xl p-8 rounded-xl border border-gray-200">
        {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        ) : !user ? (
            <div className="text-center text-red-600">
                Failed to load user profile.
            </div>
        ) : (
          <>
            {user.profile_image && (
              <img
                src={`http://localhost:8000${user.profile_image}`}
                alt="Profile"
                className="w-32 h-32 rounded-full mx-auto mb-6 object-cover border-4 border-indigo-200 shadow-sm"
              />
            )}
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              {user.first_name} {user.last_name}
            </h2>
            <p className="text-center text-gray-600 mt-1">@{user.username}</p>
            <div className="mt-8 space-y-4 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-x-4">
                <p><strong>Email:</strong></p>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <p><strong>Phone:</strong></p>
                <p className="text-gray-900">{user.phone_number || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <p><strong>Date of Birth:</strong></p>
                <p className="text-gray-900">{user.date_of_birth || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <p><strong>Joined:</strong></p>
                <p className="text-gray-900">{new Date(user.joined_at).toLocaleDateString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <p><strong>Verified:</strong></p>
                <p className="text-gray-900">{user.is_verified ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;