import React, { useEffect, useState } from 'react';

const Profile = () => {
  const [user, setUser] = useState(null);

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
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!user) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-md mx-auto bg-white shadow p-6 rounded-lg mt-10">
      {user.profile_image && (
        <img
          src={`http://localhost:8000${user.profile_image}`}
          alt="Profile"
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
      )}
      <h2 className="text-xl font-semibold text-center">
        {user.first_name} {user.last_name}
      </h2>
      <p className="text-center text-gray-600">@{user.username}</p>
      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Phone:</strong> {user.phone_number || 'N/A'}</p>
        <p><strong>DOB:</strong> {user.date_of_birth || 'N/A'}</p>
        <p><strong>Joined:</strong> {new Date(user.joined_at).toLocaleDateString()}</p>
        <p><strong>Verified:</strong> {user.is_verified ? '✅ Yes' : '❌ No'}</p>
      </div>
    </div>
  );
};

export default Profile;
