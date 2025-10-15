const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

interface SendMessageRequest {
  userId: string;
  sessionId?: string;
  message: string;
}

interface SendMessageResponse {
  sessionId: string;
  message: string;
  shouldEscalate: boolean;
  escalationReason?: string;
}

export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

export async function getUserSessions(userId: string) {
  const response = await fetch(`${API_URL}/sessions?userId=${userId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  const data = await response.json();
  return data.sessions || [];
}

export async function getConversationHistory(sessionId: string) {
  const response = await fetch(`${API_URL}/history?sessionId=${sessionId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversation history');
  }

  const data = await response.json();
  return data.messages || [];
}
