import { Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ChatDashboard from './pages/ChatDashboard';
import { Toaster } from 'react-hot-toast';
import CallModal from './components/CallModal';

function App() {
  return (
    <div className="App dark bg-gray-50 min-h-screen text-gray-900 flex flex-col font-sans">
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/chats" element={<ChatDashboard />} />
      </Routes>
      <Toaster position="top-right" />
      <CallModal />
    </div>
  );
}

export default App;
