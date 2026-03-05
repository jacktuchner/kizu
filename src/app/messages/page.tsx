"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseDate } from "@/lib/dates";

interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    image: string | null;
  };
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = parseDate(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return parseDate(dateStr).toLocaleDateString();
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (session?.user) {
      loadConversations();
    }
  }, [session, status]);

  // Poll for new conversations every 10 seconds
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No messages yet</p>
          <p className="text-sm text-gray-400">
            Start a conversation from a guide&apos;s profile page.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                conv.unreadCount > 0
                  ? "bg-teal-50 border-teal-200"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                {conv.otherParticipant.image ? (
                  <img
                    src={conv.otherParticipant.image}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-teal-700 font-bold text-lg">
                    {conv.otherParticipant.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium truncate ${conv.unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                    {conv.otherParticipant.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                    {conv.lastMessage
                      ? (conv.lastMessage.senderId === (session?.user as any)?.id ? "You: " : "") + conv.lastMessage.content
                      : "No messages yet"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="bg-teal-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
