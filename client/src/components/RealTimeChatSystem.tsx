import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, MessageCircle } from 'lucide-react'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  type: 'sent' | 'received'
}

export default function RealTimeChatSystem() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate initial messages
    const mockMessages: Message[] = [
      {
        id: '1',
        sender: 'Ahmed (Driver)',
        content: 'I am on my way to deliver your fuel order',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'received'
      },
      {
        id: '2',
        sender: 'You',
        content: 'Great! How long will it take?',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        type: 'sent'
      },
      {
        id: '3',
        sender: 'Ahmed (Driver)',
        content: 'About 15 minutes. I\'m currently at Allen Avenue',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        type: 'received'
      }
    ]
    
    setMessages(mockMessages)
    setLoading(false)
  }, [])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      sender: 'You',
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'sent'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Simulate driver response after 2 seconds
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'Ahmed (Driver)',
        content: 'Got it! Will update you shortly.',
        timestamp: new Date().toISOString(),
        type: 'received'
      }
      setMessages(prev => [...prev, response])
    }, 2000)
  }

  if (loading) {
    return <div className="p-4">Loading chat...</div>
  }

  return (
    <Card className="w-full h-96">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with Driver
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs rounded-lg p-3 ${
                  message.type === 'sent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm font-medium">{message.sender}</p>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}