import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HomeIcon, 
  ArrowPathIcon, 
  UserIcon, 
  ArrowRightIcon, 
  BellIcon,
  PaperAirplaneIcon,
  PlusCircleIcon,
  EyeIcon,
  BuildingLibraryIcon,
  // --- New Icons for Reports Section ---
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from '@heroicons/react/24/solid';

// --- Helper component for rendering dashboard sections ---
const DashboardSection = ({ title, links }) => {
  if (!links || links.length === 0) return null;

  const colorSchemes = {
    indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-500',
    sky: 'bg-sky-50 text-sky-700 hover:bg-sky-500',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-500',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-500',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-500',
    // --- New Color Schemes ---
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-500',
    teal: 'bg-teal-50 text-teal-700 hover:bg-teal-500',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
      <h2 className="text-xl font-bold text-gray-800 mb-5">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`group flex items-center space-x-4 p-4 rounded-xl font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:text-white ${colorSchemes[link.color] || colorSchemes['indigo']}`}
          >
            <div className={`p-2 rounded-lg transition-colors duration-300 ${link.iconBgColor} group-hover:bg-white/20`}>
                {React.cloneElement(link.icon, { className: `h-6 w-6 transition-colors duration-300 ${link.iconColor} group-hover:text-white` })}
            </div>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};


const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- State for each link group ---
  const [visibleGeneralLinks, setVisibleGeneralLinks] = useState([]);
  const [visibleStandardLinks, setVisibleStandardLinks] = useState([]);
  const [visibleFlyLinks, setVisibleFlyLinks] = useState([]);
  const [visibleAnalyticsLinks, setVisibleAnalyticsLinks] = useState([]);

  // --- Grouped Navigation Links with Colors ---
  const generalLinks = [
    { to: '/profile', label: 'My Profile', icon: <UserIcon />, permission: 'user', color: 'indigo', iconColor: 'text-indigo-500', iconBgColor: 'bg-indigo-100' },
  ];

  const standardTradeLinks = [
    { to: '/my-trades', label: 'My Trades', icon: <HomeIcon />, permission: 'user', color: 'sky', iconColor: 'text-sky-500', iconBgColor: 'bg-sky-100' },
    { to: '/apply-trade', label: 'Add New Trade', icon: <ArrowPathIcon />, permission: 'user', color: 'sky', iconColor: 'text-sky-500', iconBgColor: 'bg-sky-100' },
    { to: '/manager', label: 'Manager View', icon: <BellIcon />, permission: 'manager', color: 'rose', iconColor: 'text-rose-500', iconBgColor: 'bg-rose-100' },
    { to: '/manager-exit', label: 'Exit Management', icon: <ArrowRightIcon />, permission: 'manager', color: 'rose', iconColor: 'text-rose-500', iconBgColor: 'bg-rose-100' },
  ];
  
  const flyTradeLinks = [
    { to: '/fly/my', label: 'My Fly Trades', icon: <PaperAirplaneIcon />, permission: 'user', color: 'emerald', iconColor: 'text-emerald-500', iconBgColor: 'bg-emerald-100' },
    { to: '/fly/create', label: 'Create Fly Trade', icon: <PlusCircleIcon />, permission: 'user', color: 'emerald', iconColor: 'text-emerald-500', iconBgColor: 'bg-emerald-100' },
    { to: '/fly/manager', label: 'Manager Fly View', icon: <EyeIcon />, permission: 'manager', color: 'amber', iconColor: 'text-amber-500', iconBgColor: 'bg-amber-100' },
    { to: '/fly/exits', label: 'Fly Trade Exits', icon: <BuildingLibraryIcon />, permission: 'manager', color: 'amber', iconColor: 'text-amber-500', iconBgColor: 'bg-amber-100' },
  ];

  // --- New Section for Reports & Analytics ---
  const analyticsLinks = [
    { to: '/reports/performance', label: 'Performance Analytics', icon: <ChartBarIcon />, permission: 'user', color: 'purple', iconColor: 'text-purple-500', iconBgColor: 'bg-purple-100' },
    { to: '/reports/history', label: 'Full Trade History', icon: <DocumentTextIcon />, permission: 'user', color: 'purple', iconColor: 'text-purple-500', iconBgColor: 'bg-purple-100' },
    { to: '/settlement', label: 'Settlement Report', icon: <BanknotesIcon />, permission: 'manager', color: 'teal', iconColor: 'text-teal-500', iconBgColor: 'bg-teal-100' },
  ];

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/accounts/me/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` },
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
      const filterByPermission = (links) => links.filter(link => {
        return link.permission === 'manager' ? user.is_staff : true;
      });
      
      setVisibleGeneralLinks(filterByPermission(generalLinks));
      setVisibleStandardLinks(filterByPermission(standardTradeLinks));
      setVisibleFlyLinks(filterByPermission(flyTradeLinks));
      setVisibleAnalyticsLinks(filterByPermission(analyticsLinks));
    }
  }, [user]);

  return (
    <>
      {/* It's best practice to add this in your main index.html head section */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `}
      </style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-500"></div>
            </div>
          ) : (
            <>
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/80 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  Welcome, {user ? user.first_name : 'User'}!
                </h1>
                <p className="mt-3 text-lg text-gray-600 max-w-md mx-auto">
                  Your central hub for managing all trading activities.
                </p>
              </div>

              <DashboardSection title="General" links={visibleGeneralLinks} />
              <DashboardSection title="Standard Trades" links={visibleStandardLinks} />
              <DashboardSection title="Fly Trades" links={visibleFlyLinks} />
              <DashboardSection title="Reports & Analytics" links={visibleAnalyticsLinks} />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;

