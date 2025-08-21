"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Plus,
  MessageSquare,
  PanelLeft,
  MapPin,
  Wallet,
  Calendar,
  HelpCircle,
} from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isTyping?: boolean
}

interface ChatSession {
  id: string
  name: string
  messages: Message[]
  createdAt: Date
}

function TypingAnimation({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, 25)

      return () => clearTimeout(timer)
    } else if (currentIndex === text.length && text.length > 0) {
      onComplete()
    }
  }, [currentIndex, text, onComplete])

  return (
    <span className="animate-fade-in-up">
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse rounded-sm" />
      )}
    </span>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const renderMarkdown = (text: string) => {
    // Bold text
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic text
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Code blocks
    text = text.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-muted p-3 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>',
    )
    // Inline code
    text = text.replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Line breaks
    text = text.replace(/\n/g, "<br>")

    return text
  }

  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}

export function ChatBot() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const messages = currentSession?.messages || []

  const createNewSession = () => {
    setCurrentSessionId(null)
  }

  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
  }

  const generateSessionName = (message: string) => {
    return message.length > 25 ? message.substring(0, 25) + "..." : message
  }

  const handleTypingComplete = (messageId: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: session.messages.map((msg) => (msg.id === messageId ? { ...msg, isTyping: false } : msg)),
            }
          : session,
      ),
    )
  }

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }

    setTimeout(scrollToBottom, 100)
  }, [messages, isLoading, typingMessageId])

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input.trim()
    if (!messageToSend || isLoading) return

    let sessionId = currentSessionId

    if (!sessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        name: generateSessionName(messageToSend),
        messages: [],
        createdAt: new Date(),
      }
      setSessions((prev) => [newSession, ...prev])
      sessionId = newSession.id
      setCurrentSessionId(sessionId)
    }

    setError(null)

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      role: "user",
      timestamp: new Date(),
    }

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          const updatedMessages = [...session.messages, userMessage]
          return {
            ...session,
            messages: updatedMessages,
            name: session.messages.length === 0 ? generateSessionName(userMessage.content) : session.name,
          }
        }
        return session
      }),
    )

    setInput("")
    setIsLoading(true)

    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message || "Sorry, I could not process your request.",
        role: "assistant",
        timestamp: new Date(),
        isTyping: true,
      }

      setIsLoading(false)
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, messages: [...session.messages, assistantMessage] } : session,
        ),
      )
      setTypingMessageId(assistantMessage.id)
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
      setIsLoading(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

const suggestionPrompts = [
  { text: "Mənim adım Yusifdir,bazada olan şəxsi məlumatlarıma əsasən yaşadığım şəhərdə gəzməli yerlər barəsində təkliflər verməyini istəyirəm?", icon: MapPin },
  { text: "Balansımdakı pulu öyrənmək istəyirəm. Neçə manat pul var,adım Alidir.Cari məzənnə ilə Dollardan manata konvertasiya edin.", icon: Wallet },
  { text: "Adım Orxan, ad günümə neçə gün qaldığını öyrənmək istəyirəm. Bu günün tarixini qeyd edərək hesablama apar.", icon: Calendar },
  { text: "Mənə gündəlik rutinimdə kömək edəcək məsləhətlər ver", icon: HelpCircle },
]

  const handleSuggestionClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div
        className={`${isSidebarCollapsed ? "w-16" : "w-64"} bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="p-2 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
            className={`flex items-center gap-2 ${isSidebarCollapsed ? "hover:bg-gray-200 p-2 rounded-lg transition-colors" : ""}`}
          >
            <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center shadow-sm">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-serif font-bold text-lg text-black whitespace-nowrap">AI Chatbot</span>
            )}
          </button>
          {!isSidebarCollapsed && (
            <Button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-200 transition-colors"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div>
            <div className="p-4">
              <Button
                onClick={createNewSession}
                className="w-full bg-black hover:bg-gray-800 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => switchToSession(session.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-2 ${
                      currentSessionId === session.id ? "bg-gray-200 text-black" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-sm">{session.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {isSidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center">
            <div className="p-2 space-y-2 w-full flex flex-col items-center">
              <Button
                onClick={createNewSession}
                className="w-12 h-12 bg-black hover:bg-gray-800 text-white rounded-lg flex items-center justify-center transition-colors"
                title="New Chat"
              >
                <Plus className="h-5 w-5" />
              </Button>

              <div className="space-y-1 w-full flex flex-col items-center">
                {sessions.slice(0, 8).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => switchToSession(session.id)}
                    className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                      currentSessionId === session.id ? "bg-gray-200 text-black" : "hover:bg-gray-100 text-gray-700"
                    }`}
                    title={session.name}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center py-8 animate-fade-in-up">
                <div className="inline-block px-8 py-6 bg-gray-100 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="h-12 w-12 rounded-xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-6 w-6 text-black" />
                  </div>
                  <h2 className="font-serif font-bold text-lg text-black">How can I help you today?</h2>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 sm:gap-4 animate-fade-in-up ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                  </div>
                )}

                {message.role === "user" ? (
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm bg-black text-white ml-auto">
                    <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] sm:max-w-[75%] py-2">
                    <div className="text-sm sm:text-base leading-relaxed text-black">
                      {message.isTyping ? (
                        <TypingAnimation text={message.content} onComplete={() => handleTypingComplete(message.id)} />
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>
                  </div>
                )}

                {message.role === "user" && (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 sm:gap-4 justify-start animate-fade-in-up">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                </div>
                <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex gap-1">
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 bg-white">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3">
            {error && (
              <div className="mb-2 p-2 bg-gray-100 border border-gray-300 rounded-lg text-black text-sm animate-fade-in-up">
                {error}
              </div>
            )}

            {messages.length === 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {suggestionPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(prompt.text)}
                      className="p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-left shadow-sm hover:shadow-md flex items-center gap-3 min-h-[60px]"
                      disabled={isLoading}
                    >
                      <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <prompt.icon className="h-4 w-4 text-black" />
                      </div>
                      <span className="text-sm text-gray-700 font-medium leading-relaxed">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-2 text-base rounded-lg sm:rounded-xl border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white focus:bg-white transition-colors resize-none touch-manipulation text-black"
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] rounded-lg sm:rounded-xl bg-black hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 touch-manipulation text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
