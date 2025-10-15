import { useState, useEffect, useRef } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { SessionList } from './components/SessionList';
import { MessageSquare } from 'lucide-react';

function App() {
  const [userId] = useState(() => {
    const stored = localStorage.getItem('supportBotUserId');
    if (stored) return stored;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('supportBotUserId', newId);
    return newId;
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setShowSessionList(false);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSessionList(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI Support Assistant</h1>
                <p className="text-sm text-slate-500">24/7 Intelligent Customer Support</p>
              </div>
            </div>
            <button
              onClick={() => setShowSessionList(!showSessionList)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showSessionList ? 'Hide History' : 'View History'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSessionList ? (
          <SessionList
            userId={userId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        ) : (
          <ChatInterface
            userId={userId}
            sessionId={currentSessionId}
            onSessionCreated={setCurrentSessionId}
          />
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-sm text-slate-500">
        <p>Powered by AI • Escalates to human agents when needed</p>
      </footer>
    </div>
  );
}

export default App;
