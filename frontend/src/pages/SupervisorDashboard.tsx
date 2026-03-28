import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaExclamationTriangle, 
  FaMapMarkerAlt,
  FaUserCheck,
  FaUserClock
} from 'react-icons/fa';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { securityApi } from '@api/securityApi';
import { useNotification } from '@contexts/NotificationContext';

interface SecurityEvent {
  id: number;
  employee_id: number | null;
  event_type: string;
  timestamp: string;
  severity: string;
  employee?: {
    employee_id: string;
    first_name: string;
    last_name: string;
  };
}

interface LoginLog {
  id: number;
  employee_id: number;
  success: boolean;
  spoof_detected: boolean;
  timestamp: string;
  employee?: {
    employee_id: string;
    first_name: string;
    last_name: string;
  };
}

interface TeamAttendance {
  id: number;
  employee_id: number;
  check_in_time: string;
  check_out_time: string | null;
  geo_fence_status: boolean;
  employee?: {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
  };
}

const SupervisorDashboard: React.FC = () => {
  const { showError } = useNotification();
  
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [_loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<TeamAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch supervisor data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch security events
        const securityEventsResponse = await securityApi.getSecurityEvents(10);
        setSecurityEvents(securityEventsResponse.data);
        
        // Fetch login logs
        const loginLogsResponse = await securityApi.getLoginLogs(10);
        setLoginLogs(loginLogsResponse.data);
        
        // Fetch team attendance (mock data)
        const mockTeamAttendance: TeamAttendance[] = [
          {
            id: 1,
            employee_id: 101,
            check_in_time: new Date().toISOString(),
            check_out_time: null,
            geo_fence_status: true,
            employee: {
              employee_id: 'EMP001',
              first_name: 'John',
              last_name: 'Doe',
              department: 'Engineering',
            },
          },
          {
            id: 2,
            employee_id: 102,
            check_in_time: new Date(Date.now() - 3600000).toISOString(),
            check_out_time: new Date().toISOString(),
            geo_fence_status: true,
            employee: {
              employee_id: 'EMP002',
              first_name: 'Jane',
              last_name: 'Smith',
              department: 'Marketing',
            },
          },
          {
            id: 3,
            employee_id: 103,
            check_in_time: new Date(Date.now() - 7200000).toISOString(),
            check_out_time: null,
            geo_fence_status: false,
            employee: {
              employee_id: 'EMP003',
              first_name: 'Bob',
              last_name: 'Johnson',
              department: 'Sales',
            },
          },
        ];
        setTeamAttendance(mockTeamAttendance);
      } catch (error: any) {
        console.error('Supervisor data fetch error:', error);
        showError('Failed to load supervisor dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [showError]);

  // Get event type icon
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'SPOOF_ATTEMPT':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'FACE_MISMATCH':
        return <FaUserClock className="text-yellow-500" />;
      case 'GEOFENCE_VIOLATION':
        return <FaMapMarkerAlt className="text-blue-500" />;
      default:
        return <FaExclamationTriangle className="text-gray-500" />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Chart data
  const securityEventData = [
    { name: 'Spoof Attempts', value: securityEvents.filter(e => e.event_type === 'SPOOF_ATTEMPT').length },
    { name: 'Face Mismatches', value: securityEvents.filter(e => e.event_type === 'FACE_MISMATCH').length },
    { name: 'Geo Violations', value: securityEvents.filter(e => e.event_type === 'GEOFENCE_VIOLATION').length },
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your team's attendance and security events</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FaUsers className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Size</p>
                <p className="text-2xl font-bold text-gray-900">25</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Security Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {securityEvents.length}
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
                <FaUserCheck className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {teamAttendance.filter(a => a.check_out_time === null).length}
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
                <FaUserClock className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Security Events Chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Security Events Distribution</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={securityEventData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {securityEventData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team Attendance Chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Attendance Today</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { department: 'Engineering', present: 8, absent: 2 },
                    { department: 'Marketing', present: 5, absent: 1 },
                    { department: 'Sales', present: 7, absent: 3 },
                    { department: 'HR', present: 3, absent: 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="#10b981" />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Security Events Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Recent Security Events</h2>
            <div className="flex space-x-3">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="py-12 text-center">
              <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-600">Loading security events...</p>
            </div>
          ) : securityEvents.length === 0 ? (
            <div className="py-12 text-center">
              <FaExclamationTriangle className="mx-auto text-4xl text-gray-300" />
              <p className="mt-4 text-gray-600">No security events found for the selected date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {securityEvents.map((event) => (
                    <motion.tr 
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.employee ? (
                          <div>
                            <div className="font-medium">
                              {event.employee.first_name} {event.employee.last_name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {event.employee.employee_id}
                            </div>
                          </div>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="mr-2">
                            {getEventTypeIcon(event.event_type)}
                          </div>
                          <span>{event.event_type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Team Attendance Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Team Attendance Status</h2>
          </div>
          
          {loading ? (
            <div className="py-12 text-center">
              <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-600">Loading team attendance...</p>
            </div>
          ) : teamAttendance.length === 0 ? (
            <div className="py-12 text-center">
              <FaUsers className="mx-auto text-4xl text-gray-300" />
              <p className="mt-4 text-gray-600">No team attendance data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Geo-fence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamAttendance.map((attendance) => (
                    <motion.tr 
                      key={attendance.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendance.employee ? (
                          <div>
                            <div className="font-medium">
                              {attendance.employee.first_name} {attendance.employee.last_name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {attendance.employee.employee_id}
                            </div>
                          </div>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendance.employee?.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendance.check_out_time ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Checked Out
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            Present
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendance.geo_fence_status ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Within Fence
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Outside Fence
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SupervisorDashboard;