import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatRequest {
  sessionId?: string;
  userId: string;
  message: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname;

    if (path.includes('/chat') && req.method === 'POST') {
      const { sessionId, userId, message }: ChatRequest = await req.json();

      if (!userId || !message) {
        return new Response(
          JSON.stringify({ error: 'userId and message are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let currentSessionId = sessionId;

      if (!currentSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('support_sessions')
          .insert({ user_id: userId })
          .select()
          .single();

        if (sessionError) throw sessionError;
        currentSessionId = newSession.id;
      } else {
        await supabase
          .from('support_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', currentSessionId);
      }

      await supabase
        .from('conversation_messages')
        .insert({
          session_id: currentSessionId,
          role: 'user',
          content: message,
        });

      const { data: history } = await supabase
        .from('conversation_messages')
        .select('role, content')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      const { data: faqs } = await supabase
        .from('faqs')
        .select('*');

      const response = await generateResponse(message, history || [], faqs || []);

      await supabase
        .from('conversation_messages')
        .insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: response.content,
          metadata: response.metadata,
        });

      if (response.shouldEscalate) {
        await supabase
          .from('support_sessions')
          .update({
            status: 'escalated',
            escalated_reason: response.escalationReason,
          })
          .eq('id', currentSessionId);
      }

      return new Response(
        JSON.stringify({
          sessionId: currentSessionId,
          message: response.content,
          shouldEscalate: response.shouldEscalate,
          escalationReason: response.escalationReason,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/sessions') && req.method === 'GET') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: sessions } = await supabase
        .from('support_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_activity_at', { ascending: false });

      return new Response(
        JSON.stringify({ sessions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/history') && req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'sessionId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      return new Response(
        JSON.stringify({ messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateResponse(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  faqs: FAQ[]
): { content: string; metadata: any; shouldEscalate: boolean; escalationReason?: string } {
  const lowerMessage = userMessage.toLowerCase();

  const matchedFAQ = faqs.find((faq) => {
    const questionMatch = faq.question.toLowerCase().includes(lowerMessage) ||
      lowerMessage.includes(faq.question.toLowerCase().substring(0, 10));
    const keywordMatch = faq.keywords.some((kw) => lowerMessage.includes(kw.toLowerCase()));
    return questionMatch || keywordMatch;
  });

  if (matchedFAQ) {
    return {
      content: matchedFAQ.answer,
      metadata: { matched_faq_id: matchedFAQ.id, confidence: 0.9 },
      shouldEscalate: false,
    };
  }

  const greetings = ['hi', 'hello', 'hey', 'greetings'];
  if (greetings.some((g) => lowerMessage.includes(g)) && history.length <= 2) {
    return {
      content: 'Hello! I am your AI customer support assistant. How can I help you today? You can ask me about our products, services, policies, or any other questions you might have.',
      metadata: { type: 'greeting' },
      shouldEscalate: false,
    };
  }

  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return {
      content: "You're welcome! Is there anything else I can help you with?",
      metadata: { type: 'gratitude' },
      shouldEscalate: false,
    };
  }

  const escalationKeywords = ['speak to human', 'talk to agent', 'real person', 'representative', 'manager', 'complaint'];
  const shouldEscalateByKeyword = escalationKeywords.some((kw) => lowerMessage.includes(kw));

  const unansweredCount = history.filter((h) => h.role === 'user').length;
  const shouldEscalateByCount = unansweredCount >= 3;

  if (shouldEscalateByKeyword || shouldEscalateByCount) {
    const reason = shouldEscalateByKeyword
      ? 'User requested human agent'
      : 'Unable to resolve query after multiple attempts';

    return {
      content: "I understand you need additional assistance. I'm escalating your query to a human agent who will be with you shortly. A support representative will reach out to you via email within 24 hours. Is there anything else I can help with in the meantime?",
      metadata: { escalation_triggered: true },
      shouldEscalate: true,
      escalationReason: reason,
    };
  }

  const contextualResponse = generateContextualResponse(userMessage, history, faqs);
  return {
    content: contextualResponse,
    metadata: { type: 'contextual', confidence: 0.6 },
    shouldEscalate: false,
  };
}

function generateContextualResponse(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  faqs: FAQ[]
): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pay')) {
    return "I'd be happy to help with pricing information. Could you please specify which product or service you're interested in? You can also visit our pricing page for detailed information.";
  }

  if (lowerMessage.includes('refund') || lowerMessage.includes('return')) {
    return "I can assist with refund and return inquiries. Our return policy allows returns within 30 days of purchase. Could you provide your order number so I can look into this further?";
  }

  if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
    return "For shipping inquiries, standard delivery typically takes 5-7 business days. Express shipping is available for 2-3 business days. Would you like to know about a specific order's shipping status?";
  }

  if (lowerMessage.includes('account') || lowerMessage.includes('login')) {
    return "I can help with account-related issues. Are you having trouble logging in, or do you need to update your account information? Please provide more details.";
  }

  const availableCategories = [...new Set(faqs.map((f) => f.category))];
  return `I'm not sure I fully understand your question. I can help you with topics like: ${availableCategories.join(', ')}. Could you please rephrase your question or ask about one of these topics?`;
}
