import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@pages/LoginPage';
import DashboardPage from '@pages/DashboardPage';
import AttendancePage from '@pages/AttendancePage';
import LeavePage from '@pages/LeavePage';
import ReportsPage from '@pages/ReportsPage';
import SupervisorDashboard from '@pages/SupervisorDashboard';
import SecurityDashboard from '@pages/SecurityDashboard';
import FaceLogin from '@components/FaceLogin';
import MainLayout from '@components/layout/MainLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/face-login',
    element: <FaceLogin />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/attendance',
        element: <AttendancePage />,
      },
      {
        path: '/leave',
        element: <LeavePage />,
      },
      {
        path: '/reports',
        element: <ReportsPage />,
      },
      {
        path: '/supervisor',
        element: <SupervisorDashboard />,
      },
      {
        path: '/security',
        element: <SecurityDashboard />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);