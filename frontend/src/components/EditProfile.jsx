import React, { useState, useEffect } from 'react';

const EditProfile = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    profile_image: null,
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/me/', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access')}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          date_of_birth: data.date_of_birth || '',
          profile_image: null,
        });
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profile_image') {
      setFormData({ ...formData, profile_image: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    for (const key in formData) {
      if (formData[key]) form.append(key, formData[key]);
    }

    const res = await fetch('http://localhost:8000/api/me/update/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access')}`,
      },
      body: form,
    });

    if (res.ok) alert('Profile updated!');
    else alert('Failed to update profile');
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl mb-4 font-semibold">Edit Profile</h2>
      <input name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleChange} className="input" />
      <input name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleChange} className="input" />
      <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="input" />
      <input name="phone_number" placeholder="Phone Number" value={formData.phone_number} onChange={handleChange} className="input" />
      <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="input" />
      <input type="file" name="profile_image" onChange={handleChange} className="input" />
      <button type="submit" className="btn mt-4">Save</button>
    </form>
  );
};

export default EditProfile;
