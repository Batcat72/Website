import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaUserClock, 
  FaCalendarAlt, 
  FaChartBar, 
  FaShieldAlt, 
  FaMapMarkerAlt,
  FaCamera,
  FaSignOutAlt
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { attendanceApi } from '@api/attendanceApi';
import { securityApi } from '@api/securityApi';
import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { locationService } from '@services/locationService';
import { formatDistance, getGeoFenceStatusText, getGeoFenceStatusColor } from '@utils/geofenceUtils';

interface AttendanceStats {
  totalCheckins: number;
  averageHours: string;
  geoFenceCompliance: string;
  lateArrivals: number;
}

interface SecurityEvent {
  id: number;
  event_type: string;
  timestamp: string;
  severity: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showError } = useNotification();
  
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<'checked-in' | 'checked-out' | 'loading' | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get attendance stats
        const statsResponse = await attendanceApi.getStats('month');
        setAttendanceStats(statsResponse.data);
        
        // Get recent security events
        const eventsResponse = await securityApi.getSecurityEvents(5);
        setSecurityEvents(eventsResponse.data);
        
        // Get user location
        try {
          const loc = await locationService.getCurrentPosition();
          setLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
        } catch (err) {
          console.error('Location error:', err);
        }
        
        // Check current check-in status (mock implementation)
        // In a real app, this would check the database
        setCheckInStatus(Math.random() > 0.5 ? 'checked-in' : 'checked-out');
        setLastCheckIn(new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString());
      } catch (error: any) {
        console.error('Dashboard data fetch error:', error);
        showError('Failed to load dashboard data');
      }
    };
    
    fetchData();
  }, [showError]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (!location) {
      showError('Location not available. Please enable location services.');
      return;
    }
    
    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate a successful check-in
      setCheckInStatus('loading');
      
      setTimeout(() => {
        setCheckInStatus('checked-in');
        setLastCheckIn(new Date().toISOString());
      }, 1500);
    } catch (error: any) {
      console.error('Check-in error:', error);
      showError('Check-in failed. Please try again.');
      setCheckInStatus('checked-out');
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate a successful check-out
      setCheckInStatus('loading');
      
      setTimeout(() => {
        setCheckInStatus('checked-out');
      }, 1500);
    } catch (error: any) {
      console.error('Check-out error:', error);
      showError('Check-out failed. Please try again.');
      setCheckInStatus('checked-in');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      showError('Logout failed. Please try again.');
    }
  };

  // Chart data
  const attendanceChartData = [
    { day: 'Mon', hours: 8.5 },
    { day: 'Tue', hours: 9.2 },
    { day: 'Wed', hours: 7.8 },
    { day: 'Thu', hours: 8.9 },
    { day: 'Fri', hours: 8.3 },
  ];

  const complianceData = [
    { name: 'Within Fence', value: 92 },
    { name: 'Outside Fence', value: 8 },
  ];

  const COLORS = ['#10B981', '#EF4444'];
  const isLoading = checkInStatus === 'loading';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {(user as any)?.firstName ?? ''} {(user as any)?.lastName ?? ''}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FaUserClock className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.totalCheckins || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FaCalendarAlt className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Hours/Day</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.averageHours || '0'}h
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <FaMapMarkerAlt className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Geo Compliance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.geoFenceCompliance || '0'}%
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FaChartBar className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.lateArrivals || 0}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Attendance Chart */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Attendance</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Security Events */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Security Events</h2>
              <div className="space-y-4">
                {securityEvents.length > 0 ? (
                  securityEvents.map((event) => (
                    <div key={event.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        event.severity === 'high' || event.severity === 'critical' 
                          ? 'bg-red-100 text-red-600' 
                          : event.severity === 'medium' 
                            ? 'bg-yellow-100 text-yellow-600' 
                            : 'bg-green-100 text-green-600'
                      }`}>
                        <FaShieldAlt />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="font-medium text-gray-900">{event.event_type}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        event.severity === 'high' || event.severity === 'critical' 
                          ? 'bg-red-100 text-red-800' 
                          : event.severity === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent security events</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Check-in Widget */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance</h2>
              <div className="text-center py-4">
                {checkInStatus === 'checked-in' ? (
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full inline-block">
                    Checked In
                  </div>
                ) : checkInStatus === 'checked-out' ? (
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-full inline-block">
                    Checked Out
                  </div>
                ) : (
                  <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full inline-block">
                    Loading...
                  </div>
                )}
                
                {lastCheckIn && (
                  <p className="text-sm text-gray-600 mt-2">
                    Last check-in: {new Date(lastCheckIn).toLocaleTimeString()}
                  </p>
                )}
              </div>
              
              <div className="mt-6 space-y-3">
                {checkInStatus === 'checked-out' ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    <FaCamera className="mr-2" />
                    Check In
                  </button>
                ) : checkInStatus === 'checked-in' ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <FaUserClock className="mr-2" />
                    Check Out
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-600 rounded-lg"
                  >
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </button>
                )}
              </div>
              
              {location && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Current Location</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {/* Geo-fence Compliance */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Geo-fence Compliance</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complianceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {complianceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className={`text-sm ${getGeoFenceStatusColor(true)}`}>
                  {getGeoFenceStatusText(true)} - {formatDistance(50)} from office
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;