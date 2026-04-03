import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getStoreMessages, markMessageRead } from '@/services/storefrontService';
import { QuickStore } from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Mail, MailOpen, Phone, AtSign, Clock, X, ChevronRight, MessageSquare, Inbox,
} from 'lucide-react';
import { MessageListSkeleton } from "@/components/Skeletons";

interface OutletContextType {
  store: QuickStore | null;
}

interface StoreMessage {
  id: string;
  quick_store_id: string;
  sender_name: string;
  sender_phone: string;
  sender_email: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

const QSMessages: React.FC = () => {
  const { store } = useOutletContext<OutletContextType>();
  const [messages, setMessages] = useState<StoreMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StoreMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadMessages = async () => {
    if (!store?.id) return;
    const result = await getStoreMessages(store.id);
    if (result.success) {
      setMessages(result.data as StoreMessage[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, [store?.id]);

  const handleSelect = async (msg: StoreMessage) => {
    setSelected(msg);
    if (!msg.is_read) {
      await markMessageRead(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const unreadCount = messages.filter(m => !m.is_read).length;
  const filtered = filter === 'unread' ? messages.filter(m => !m.is_read) : messages;

  if (!store) {
    return <div className="p-6 text-center text-gray-500">Please complete store setup first</div>;
  }

  if (loading) {
    return <MessageListSkeleton count={5} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Messages</h1>
          <p className="text-sm text-[#7c7c7c]">
            {messages.length} total · {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No messages yet</h3>
            <p className="text-sm text-[#7c7c7c]">
              Messages from your contact form will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* Message List */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <MailOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-[#7c7c7c]">No unread messages</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                    selected?.id === msg.id
                      ? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
                      : msg.is_read
                        ? 'border-gray-100 bg-white hover:border-gray-200'
                        : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                        msg.is_read ? 'bg-gray-100 text-gray-500' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${msg.is_read ? 'font-medium' : 'font-bold'}`}>
                            {msg.sender_name}
                          </span>
                          {!msg.is_read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#7c7c7c] mt-0.5">
                          {msg.sender_phone}
                          {msg.sender_email && <> · {msg.sender_email}</>}
                        </p>
                        <p className="text-sm text-[#7c7c7c] mt-1 truncate">{msg.message}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-[#7c7c7c]">{formatDate(msg.created_at)}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Message Detail */}
          <div className="xl:sticky xl:top-4">
            {selected ? (
              <Card>
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold">
                        {selected.sender_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selected.sender_name}</h3>
                        <div className="flex items-center gap-1.5 text-sm text-[#7c7c7c]">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(selected.created_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="text-gray-400 hover:text-gray-600 xl:hidden"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <a
                      href={`tel:${selected.sender_phone}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm hover:bg-gray-100 transition-colors"
                    >
                      <Phone className="h-4 w-4 text-indigo-500" />
                      {selected.sender_phone}
                    </a>
                    {selected.sender_email && (
                      <a
                        href={`mailto:${selected.sender_email}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm hover:bg-gray-100 transition-colors"
                      >
                        <AtSign className="h-4 w-4 text-indigo-500" />
                        {selected.sender_email}
                      </a>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ borderTopWidth: '1px', borderColor: 'rgba(124,124,124,0.15)' }} />

                  {/* Message */}
                  <div className="mt-5">
                    <p className="text-[16px] text-gray-800 leading-relaxed whitespace-pre-line">
                      {selected.message}
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-6">
                    <a href={`tel:${selected.sender_phone}`}>
                      <Button size="sm" className="gap-1.5">
                        <Phone className="h-4 w-4" />
                        Call Back
                      </Button>
                    </a>
                    {selected.sender_email && (
                      <a href={`mailto:${selected.sender_email}`}>
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <Mail className="h-4 w-4" />
                          Reply via Email
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-[#7c7c7c]">Select a message to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QSMessages;
