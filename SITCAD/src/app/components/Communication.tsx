import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mockStudents } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, MessageSquare, Send, Inbox, Mail, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  from: string;
  fromRole: 'teacher' | 'parent';
  to: string;
  subject: string;
  message: string;
  date: string;
  read: boolean;
  studentName?: string;
}

export function Communication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('');

  if (!user) {
    navigate('/');
    return null;
  }

  const isTeacher = user.role === 'teacher';

  // Mock messages
  const mockMessages: Message[] = [
    {
      id: 'msg1',
      from: isTeacher ? 'Mr Parent & Mrs Parent' : 'Teacher SITCAD',
      fromRole: isTeacher ? 'parent' : 'teacher',
      to: user.name,
      subject: 'Question about homework',
      message: 'Hi, I wanted to ask about my child progress this week . Could you provide more details?',
      date: '2026-02-19',
      read: false,
      studentName: 'Little Sprout1',
    },
  ];

  const sentMessages: Message[] = [
    {
      id: 'sent1',
      from: user.name,
      fromRole: user.role,
      to: isTeacher ? 'Mr Parent & Mrs Parent' : 'Teacher SITCAD',
      subject: 'Weekly newsletter',
      message: 'Please see attached the weekly newsletter with upcoming events and activities.',
      date: '2026-02-17',
      read: true,
    },
  ];

  const handleSendMessage = () => {
    if (!newSubject || !newMessage) {
      toast.error('Please fill in all fields');
      return;
    }

    // Mock send - in production, this would save to Supabase
    toast.success('Message sent successfully!');
    setNewSubject('');
    setNewMessage('');
    setRecipient('');
  };

  const unreadCount = mockMessages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <header className="bg-white border-b shadow-sm sticky top-1 z-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(isTeacher ? '/teacher' : '/parent')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Communication Center</h1>
              <p className="text-sm text-muted-foreground">
                {isTeacher ? 'Connect with parents' : 'Connect with teachers'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="inbox" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Mail className="h-4 w-4" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="compose" className="gap-2">
              <Send className="h-4 w-4" />
              Compose
            </TabsTrigger>
          </TabsList>

          {/* Inbox */}
          <TabsContent value="inbox" className="space-y-4">
            {mockMessages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No messages in your inbox
                </CardContent>
              </Card>
            ) : (
              mockMessages.map((message) => (
                <Card key={message.id} className={`border-2 ${!message.read ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{message.subject}</CardTitle>
                          {!message.read && <Badge variant="destructive">New</Badge>}
                        </div>
                        <CardDescription className="space-y-1">
                          <div>From: <span className="font-medium">{message.from}</span> ({message.fromRole})</div>
                          {message.studentName && (
                            <div>Regarding: <span className="font-medium">{message.studentName}</span></div>
                          )}
                          <div>{new Date(message.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{message.message}</p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="default" size="sm">
                        <Send className="mr-2 h-3 w-3" />
                        Reply
                      </Button>
                      <Button variant="outline" size="sm">
                        Mark as Read
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Sent */}
          <TabsContent value="sent" className="space-y-4">
            {sentMessages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No sent messages
                </CardContent>
              </Card>
            ) : (
              sentMessages.map((message) => (
                <Card key={message.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{message.subject}</CardTitle>
                    <CardDescription>
                      <div>To: <span className="font-medium">{message.to}</span></div>
                      <div>{new Date(message.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{message.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Compose */}
          <TabsContent value="compose">
            <Card>
              <CardHeader>
                <CardTitle>New Message</CardTitle>
                <CardDescription>
                  Send a message to {isTeacher ? 'parents' : 'your child\'s teacher'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">To:</label>
                  <Input
                    placeholder={isTeacher ? "Select parent or enter email" : "Teacher email"}
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject:</label>
                  <Input
                    placeholder="Message subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message:</label>
                  <Textarea
                    placeholder="Type your message here..."
                    rows={8}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSendMessage} className="flex-1">
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setNewSubject('');
                    setNewMessage('');
                    setRecipient('');
                  }}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Templates for Teachers */}
            {isTeacher && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>Quick templates for common messages</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-left"
                    onClick={() => {
                      setNewSubject('Weekly Progress Update');
                      setNewMessage('Dear Parent,\n\nI wanted to share an update on your child\'s progress this week...');
                    }}
                  >
                    <span className="font-medium">Weekly Progress Update</span>
                    <span className="text-xs text-muted-foreground mt-1">Share weekly achievements</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-left"
                    onClick={() => {
                      setNewSubject('Upcoming Event Reminder');
                      setNewMessage('Dear Parent,\n\nThis is a friendly reminder about our upcoming...');
                    }}
                  >
                    <span className="font-medium">Event Reminder</span>
                    <span className="text-xs text-muted-foreground mt-1">Notify about events</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-left"
                    onClick={() => {
                      setNewSubject('Request for Conference');
                      setNewMessage('Dear Parent,\n\nI would like to schedule a brief conference to discuss...');
                    }}
                  >
                    <span className="font-medium">Conference Request</span>
                    <span className="text-xs text-muted-foreground mt-1">Schedule parent meeting</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-left"
                    onClick={() => {
                      setNewSubject('Positive Behavior Note');
                      setNewMessage('Dear Parent,\n\nI wanted to share something wonderful about your child today...');
                    }}
                  >
                    <span className="font-medium">Positive Note</span>
                    <span className="text-xs text-muted-foreground mt-1">Celebrate achievements</span>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}