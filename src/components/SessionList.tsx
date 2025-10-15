import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { getUserSessions } from '../services/api';

interface Session {
  id: string;
  user_id: string;
  started_at: string;
  last_activity_at: string;
  status: 'active' | 'resolved' | 'escalated';
  escalated_reason?: string;
}

interface SessionListProps {
  userId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function SessionList({ userId, onSelectSession, onNewChat }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await getUserSessions(userId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'escalated':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'escalated':
        return 'Escalated';
      default:
        return 'Active';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'escalated':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Conversation History</h2>
          <p className="text-sm text-slate-500 mt-1">View and resume your past conversations</p>
        </div>
        <button
          onClick={onNewChat}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-500 mt-4">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Conversations Yet</h3>
            <p className="text-slate-500 mb-6">Start a new chat to begin</p>
            <button
              onClick={onNewChat}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start New Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(session.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                        <div className="flex items-center text-xs text-slate-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(session.last_activity_at)}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-1">
                        Session started {formatDate(session.started_at)}
                      </p>
                      {session.escalated_reason && (
                        <p className="text-xs text-amber-600 mt-1 line-clamp-1">
                          Reason: {session.escalated_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-blue-600 text-sm font-medium">View →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
