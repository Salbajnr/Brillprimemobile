import { useState } from "react";
import { Button } from "@/components/ui/button";
import cameraIcon from "../../assets/images/camera_icon.png";

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

interface StandardizedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  onCameraClick?: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  isOwnMessage: boolean;
  senderName: string;
  timestamp: Date;
  messageType?: "TEXT" | "QUOTE_REQUEST" | "QUOTE_RESPONSE" | "ORDER_UPDATE";
}

interface StandardizedChatMessagesProps {
  messages: ChatMessage[];
}

export function StandardizedChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Message...",
  disabled = false,
  onCameraClick
}: StandardizedChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSend();
    }
  };

  return (
    <div className="p-5 bg-white">
      <div className="flex items-center space-x-3">
        {/* Message Input Container */}
        <div className="flex-1 relative">
          <div 
            className="rounded-3xl border-3 px-4 py-4"
            style={{ borderColor: COLORS.PRIMARY }}
          >
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              className="w-full bg-transparent outline-none text-base"
              style={{ 
                color: value ? COLORS.TEXT : '#D9D9D9',
                fontFamily: 'Montserrat',
                fontWeight: '400'
              }}
            />
          </div>
        </div>
        
        {/* Camera Button */}
        <Button
          onClick={onCameraClick || (() => console.log('Camera button clicked'))}
          disabled={disabled}
          className="w-15 h-15 p-0 rounded-full border-3 hover:opacity-80 transition-opacity"
          style={{ 
            borderColor: COLORS.PRIMARY,
            backgroundColor: COLORS.WHITE
          }}
        >
          <img 
            src={cameraIcon} 
            alt="Camera" 
            className="w-10 h-10"
            style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
          />
        </Button>
      </div>
    </div>
  );
}

export function StandardizedChatMessages({ messages }: StandardizedChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: COLORS.WHITE }}>
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${message.isOwnMessage ? 'order-2' : 'order-1'}`}>
              <div
                className="rounded-2xl p-3"
                style={{
                  backgroundColor: message.isOwnMessage ? COLORS.PRIMARY : COLORS.SECONDARY,
                  color: COLORS.WHITE,
                  fontFamily: 'Montserrat',
                  fontWeight: '500'
                }}
              >
                {message.messageType === "QUOTE_REQUEST" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                    <span className="text-sm font-medium text-yellow-800">Quote Request</span>
                  </div>
                )}
                
                {message.messageType === "QUOTE_RESPONSE" && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                    <span className="text-sm font-medium text-green-800">Quote Response</span>
                  </div>
                )}
                
                <p className="text-sm">{message.content}</p>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs opacity-80">
                    {message.senderName}
                  </span>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Complete standardized chat interface
interface StandardizedChatProps {
  messages: ChatMessage[];
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onCameraClick?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function StandardizedChat({
  messages,
  newMessage,
  onMessageChange,
  onSendMessage,
  onCameraClick,
  disabled = false,
  placeholder = "Message..."
}: StandardizedChatProps) {
  return (
    <div className="flex flex-col h-full">
      <StandardizedChatMessages messages={messages} />
      <StandardizedChatInput
        value={newMessage}
        onChange={onMessageChange}
        onSend={onSendMessage}
        onCameraClick={onCameraClick}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}