import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, MessageSquare, Send, Inbox, Mail, CheckCircle, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Duckpit from './Duckpit';

import { API_BASE } from '../lib/api';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

export function Communication() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inboxMessages, setInboxMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  if (!user) {
    navigate('/');
    return null;
  }

  const isTeacher = user.role === 'teacher';

  const fetchData = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const [inboxRes, sentRes, contactsRes] = await Promise.all([
        fetch(`${API_BASE}/messages/inbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        }),
        fetch(`${API_BASE}/messages/sent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        }),
        fetch(`${API_BASE}/messages/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        }),
      ]);
      if (inboxRes.ok) setInboxMessages(await inboxRes.json());
      if (sentRes.ok) setSentMessages(await sentRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async () => {
    if (!recipientId || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSending(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, recipient_id: recipientId, subject, body }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to send message');
      }
      toast.success('Message sent!');
      setRecipientId('');
      setSubject('');
      setBody('');
      await fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleMarkRead = async (messageId) => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/messages/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, message_id: messageId }),
      });
      if (res.ok) {
        setInboxMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
        );
      }
    } catch (error) {
      console.error('Error marking message read:', error);
    }
  };

  const unreadCount = inboxMessages.filter((m) => !m.read).length;

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="dashboard-card-shade border-white/70 shadow-md animate-pulse">
          <CardHeader>
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-gray-100 rounded w-4/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMessageCard = (message, isSent = false) => (
    <Card
      key={message.id}
      className={`border shadow-sm ${!isSent && !message.read ? 'border-l-4 border-l-blue-400' : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{message.subject}</CardTitle>
              {!isSent && !message.read && (
                <Badge variant="destructive" className="text-xs px-2 py-0">New</Badge>
              )}
            </div>
            <CardDescription className="text-sm space-y-0.5">
              <div>
                {isSent ? 'To' : 'From'}:{' '}
                <span className="font-medium">{isSent ? message.recipient_name : message.sender_name}</span>
                {' '}
                <Badge variant="outline" className="text-xs ml-1">
                  {isSent ? message.recipient_role : message.sender_role}
                </Badge>
              </div>
              <div className="text-xs">
                {message.created_at
                  ? new Date(message.created_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        {!isSent && !message.read && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => handleMarkRead(message.id)}
            >
              <CheckCircle className="h-3 w-3 mr-1" /> Mark as Read
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit count={24} gravity={0.5} friction={0.9975} wallBounce={0.9} className="h-full w-full opacity-100" />
      </div>
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />

      <div className="relative z-10">
        <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Communication Center</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isTeacher ? 'Connect with parents' : "Connect with your child's teacher"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => navigate(isTeacher ? '/teacher' : '/parent')} className="cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {loading ? renderSkeleton() : (
            <Tabs defaultValue="inbox" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="inbox" className="text-base gap-2 cursor-pointer">
                  <Inbox className="h-4 w-4" />
                  Inbox
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="text-base gap-2 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  Sent
                </TabsTrigger>
                <TabsTrigger value="compose" className="text-base gap-2 cursor-pointer">
                  <Send className="h-4 w-4" />
                  Compose
                </TabsTrigger>
              </TabsList>

              {/* Inbox */}
              <TabsContent value="inbox" className="space-y-4">
                <Card className="dashboard-card-shade border-white/70 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Inbox className="h-5 w-5 text-[#3090A0]" />
                      Received Messages
                    </CardTitle>
                    <CardDescription>
                      Messages from {isTeacher ? 'parents' : 'teachers'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {inboxMessages.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Inbox className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                        <p>No messages in your inbox</p>
                      </div>
                    ) : (
                      inboxMessages.map((m) => renderMessageCard(m, false))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sent */}
              <TabsContent value="sent" className="space-y-4">
                <Card className="dashboard-card-shade border-white/70 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-[#3090A0]" />
                      Sent Messages
                    </CardTitle>
                    <CardDescription>Messages you've sent</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sentMessages.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                        <p>No sent messages yet</p>
                      </div>
                    ) : (
                      sentMessages.map((m) => renderMessageCard(m, true))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compose */}
              <TabsContent value="compose">
                <Card className="dashboard-card-shade border-white/70 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-[#3090A0]" />
                      New Message
                    </CardTitle>
                    <CardDescription>
                      Send a message to {isTeacher ? 'a parent' : "your child's teacher"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">To:</label>
                      {contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No contacts available. {isTeacher ? 'Assign students to see their parents here.' : 'Your child needs to be assigned to a teacher first.'}
                        </p>
                      ) : (
                        <Select value={recipientId} onValueChange={setRecipientId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select recipient" />
                          </SelectTrigger>
                          <SelectContent>
                            {contacts.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.role})
                                {c.children?.length > 0 && ` — ${c.children.map((ch) => ch.name).join(', ')}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject:</label>
                      <Input
                        placeholder="Message subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Message:</label>
                      <Textarea
                        placeholder="Type your message here..."
                        rows={8}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleSend}
                        disabled={sending || !recipientId || !subject.trim() || !body.trim()}
                        className="flex-1 bg-[#3090A0] hover:bg-[#2FBFA5] text-white cursor-pointer"
                      >
                        {sending ? (
                          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                        ) : (
                          <><Send className="mr-2 h-4 w-4" /> Send Message</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          setRecipientId('');
                          setSubject('');
                          setBody('');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

