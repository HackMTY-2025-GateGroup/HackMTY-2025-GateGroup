import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// API helper that attaches token and resolves the backend path
import { post } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content:
        "Hello! How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { signOut } = useAuth();

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = {
      id: Date.now() + 1,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistically add user's message
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    // Build a simple conversationHistory to send to backend
    // Map both user and assistant messages to preserve context
    const conversationHistory = messages
      .concat(userMessage)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      // Use absolute backend route to ensure correct resolution
      const body = await post('/api/ai/query', {
        query: userMessage.content,
        conversationHistory,
        // you can add extra metadata here (e.g., user id) if backend expects it
      });

      // backend may return { data: result } or result directly
      const result = body?.data ?? body;

      let assistantText = '';

      // Normalize different possible response shapes
      if (!result) {
        assistantText = 'No response from AI service.';
      } else if (typeof result === 'string') {
        assistantText = result;
      } else if (result.action === 'query_executed') {
        assistantText =
          result.formatted ||
          result.sql ||
          (result.data ? JSON.stringify(result.data, null, 2) : 'Query executed.');
      } else if (result.action === 'request_info' || result.action === 'general_response') {
        assistantText = result.message || JSON.stringify(result, null, 2);
      } else if (result.action === 'error') {
        assistantText = result.error || 'Error processing AI request.';
      } else {
        // Fallback: stringify the response
        assistantText = JSON.stringify(result, null, 2);
      }

      const aiMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      // If backend returns 401/unauthorized, sign the user out
      if (err?.status === 401) {
        await signOut();
        return;
      }

      const errorMessage = err?.message || 'Failed to contact AI service';
      const aiMessage = {
        id: Date.now() + 3,
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-12rem)]">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Chatbot</h2>
        <p className="text-muted-foreground mt-1">
          Get instant answers and insights about product management
        </p>
      </div>

      <Card className="h-[calc(100vh + 1rem)] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
              />
              <Button onClick={handleSend} size="icon" disabled={sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chatbot;