import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from '@contexts/AuthContext';
import { NotificationProvider } from '@contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;