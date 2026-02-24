import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, X, Plus } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function YggiChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check authentication status and load conversation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadOrCreateConversation(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadOrCreateConversation(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadOrCreateConversation = async (userId: string) => {
    try {
      const { data: conversations, error: fetchError } = await supabase
        .from("yggi_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        setConversationId(conv.id);
        const loadedMessages = Array.isArray(conv.messages) ? conv.messages as Message[] : [];
        setMessages(loadedMessages);
      } else {
        const { data: newConv, error: createError } = await supabase
          .from("yggi_conversations")
          .insert({ user_id: userId, messages: [] })
          .select()
          .single();

        if (createError) throw createError;
        setConversationId(newConv.id);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const saveConversation = async (updatedMessages: Message[]) => {
    if (!conversationId || !user) return;

    try {
      await supabase
        .from("yggi_conversations")
        .update({ messages: updatedMessages })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  const startNewConversation = async () => {
    if (!user) return;

    try {
      const { data: newConv, error } = await supabase
        .from("yggi_conversations")
        .insert({ user_id: user.id, messages: [] })
        .select()
        .single();

      if (error) throw error;

      setConversationId(newConv.id);
      setMessages([]);
      toast.success("Started new conversation");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start new conversation");
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Don't show on homepage, chat page, or when not logged in
  if (!user || location.pathname === '/' || location.pathname === '/chat') {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to chat with Yggi");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yggi-chat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (response.status === 402) {
          toast.error("AI credits depleted. Please add credits to continue.");
        } else {
          toast.error(errorData.error || "Failed to get response from Yggi");
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch (e) {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            // Ignore
          }
        }
      }

      const updatedMessages = [...messages, userMessage, { id: assistantId, role: "assistant" as const, content: assistantContent }];
      await saveConversation(updatedMessages);
    } catch (error) {
      console.error("Error chatting with Yggi:", error);
      toast.error("Failed to connect to Yggi. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Trigger button (shared between mobile and desktop)
  const TriggerButton = (
    <Button
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50 bg-[hsl(30,40%,50%)] hover:bg-[hsl(30,40%,45%)] text-white"
      size="icon"
      aria-label="Chat with Yggi"
    >
      <span className="text-2xl">🌱</span>
    </Button>
  );

  // Mobile: navigate to full-page chat
  if (isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50 bg-[hsl(30,40%,50%)] hover:bg-[hsl(30,40%,45%)] text-white"
              size="icon"
              aria-label="Chat with Yggi"
              onClick={() => navigate("/chat")}
            >
              <span className="text-2xl">🌱</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Yggi the Guide</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Desktop: use Sheet (right sidebar)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              {TriggerButton}
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Yggi the Guide</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[450px] p-0 flex flex-col"
      >
        <SheetHeader className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span className="text-xl">🌱</span>
                Chat with Yggi
              </div>
              <p className="text-sm text-muted-foreground">
                Your spiritual guide with full knowledge of your journey
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                disabled={isLoading || messages.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">
                  Ask Yggi anything about your journey, patterns, or insights
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span>🌱</span>
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span>🌱</span>
                </div>
                <div className="rounded-lg px-4 py-3 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <SheetFooter className="border-t p-4 flex-shrink-0 bg-background">
          <div className="flex gap-2 w-full">
            <Textarea
              ref={textareaRef}
              placeholder="Ask Yggi anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="min-h-[60px] resize-none"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
