import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, ArrowPathIcon, UserIcon, ArrowRightIcon, BellIcon } from '@heroicons/react/24/solid';

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleLinks, setVisibleLinks] = useState([]);

  const navLinks = [
    { to: '/my-trades', label: 'My Trades View', icon: <HomeIcon className="h-6 w-6" />, permission: 'user' },
    { to: '/apply-trade', label: 'Add Trade', icon: <ArrowPathIcon className="h-6 w-6" />, permission: 'user' },
    { to: '/profile', label: 'Profile', icon: <UserIcon className="h-6 w-6" />, permission: 'user' },
    { to: '/manager', label: 'Manager Trades View', icon: <BellIcon className="h-6 w-6" />, permission: 'manager' },
    { to: '/manager-exit', label: 'Manager Exit Management', icon: <ArrowRightIcon className="h-6 w-6" />, permission: 'manager' },
  ];

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

  useEffect(() => {
    if (user) {
      const filteredLinks = navLinks.filter(link => {
        if (link.permission === 'manager') {
            console.log(user)
          return user.is_staff;
        }
        return true;
      });
      setVisibleLinks(filteredLinks);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user ? `${user.first_name} ${user.last_name}` : 'User'}!
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your trades and navigate the application with the links below.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center space-x-3 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200 text-indigo-700 font-medium"
                  >
                    <div className="text-indigo-500">{link.icon}</div>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;