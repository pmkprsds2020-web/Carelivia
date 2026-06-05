'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/lib/store';
import type { User, Consultation, Message, DoctorProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Paperclip,
  Mic,
  Video,
  Phone,
  Info,
  ArrowLeft,
  Search,
  Star,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface DoctorWithProfile extends User {
  doctorProfile?: DoctorProfile;
}

interface ChatMessage extends Message {
  sender?: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

type FilterTab = 'semua' | 'umum' | 'anak' | 'penyakit_dalam' | 'kebidanan' | 'gigi';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'umum', label: 'Umum' },
  { key: 'anak', label: 'Anak' },
  { key: 'penyakit_dalam', label: 'Penyakit Dalam' },
  { key: 'kebidanan', label: 'Kebidanan' },
  { key: 'gigi', label: 'Gigi' },
];

const SPECIALIZATION_LABELS: Record<string, string> = {
  umum: 'Dokter Umum',
  anak: 'Dokter Anak',
  penyakit_dalam: 'Penyakit Dalam',
  kebidanan: 'Dokter Kebidanan',
  gigi: 'Dokter Gigi',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hari Ini';
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function isDifferentDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString();
}

function formatFee(fee: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(fee);
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ChatPanel() {
  const {
    currentUser,
    doctors,
    setDoctors,
    consultations,
    setConsultations,
    activeConsultation,
    setActiveConsultation,
    messages,
    setMessages,
    addMessage,
    onlineDoctors,
    setOnlineDoctors,
    selectedChatDoctor,
    setSelectedChatDoctor,
  } = useStore();

  // Local state
  const [activeFilter, setActiveFilter] = useState<FilterTab>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showChatArea, setShowChatArea] = useState(false); // mobile toggle
  const [creatingConsultation, setCreatingConsultation] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // ── Derived data ───────────────────────────────────────────────────────

  const filteredDoctors = doctors.filter((doc) => {
    const spec = doc.doctorProfile?.specialization;
    if (activeFilter !== 'semua' && spec !== activeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        (spec && SPECIALIZATION_LABELS[spec]?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isDoctorOnline = (userId: string): boolean => {
    return onlineDoctors.includes(userId);
  };

  // Get consultation for a specific doctor
  const getConsultationForDoctor = (doctorId: string): Consultation | undefined => {
    return consultations.find(
      (c) =>
        c.doctorId === doctorId &&
        (c.status === 'active' || c.status === 'waiting') &&
        c.patientId === currentUser?.id
    );
  };

  // ── Fetch doctors ──────────────────────────────────────────────────────

  const fetchDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (data.doctors) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [setDoctors]);

  // ── Fetch consultations ────────────────────────────────────────────────

  const fetchConsultations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/consultations?patientId=${currentUser.id}`);
      const data = await res.json();
      if (data.consultations) {
        setConsultations(data.consultations);
      }
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
    }
  }, [currentUser, setConsultations]);

  // ── Fetch messages for a consultation ──────────────────────────────────

  const fetchMessages = useCallback(
    async (consultationId: string) => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/consultations/${consultationId}/messages`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [setMessages]
  );

  // ── Initialize ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDoctors();
    fetchConsultations();
  }, [fetchDoctors, fetchConsultations]);

  // ── Socket.IO Connection ───────────────────────────────────────────────

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[ChatPanel] Socket connected:', socket.id);

      // If we have an active consultation, rejoin
      if (activeConsultation && currentUser) {
        socket.emit('join-consultation', {
          consultationId: activeConsultation.id,
          userId: currentUser.id,
          role: currentUser.role,
        });
      }
    });

    socket.on('new-message', (msg: ChatMessage) => {
      if (msg.consultationId === activeConsultation?.id) {
        addMessage({
          id: msg.id,
          consultationId: msg.consultationId,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type as Message['type'],
          status: msg.status as Message['status'],
          createdAt: msg.createdAt || new Date().toISOString(),
          fileUrl: msg.fileUrl,
        });
      }
    });

    socket.on('user-typing', (data: { consultationId: string; userId: string }) => {
      if (data.consultationId === activeConsultation?.id && data.userId !== currentUser?.id) {
        setIsTyping(true);
      }
    });

    socket.on('user-stop-typing', (data: { consultationId: string; userId: string }) => {
      if (data.consultationId === activeConsultation?.id) {
        setIsTyping(false);
      }
    });

    socket.on('messages-read', (data: { consultationId: string; userId: string }) => {
      // Mark messages as read in the UI
    });

    socket.on('doctor-status-change', (data: { doctorId: string; status: string }) => {
      if (data.status === 'online') {
        setOnlineDoctors([...onlineDoctors, data.doctorId]);
      } else {
        setOnlineDoctors(onlineDoctors.filter((id) => id !== data.doctorId));
      }
    });

    socket.on('disconnect', () => {
      console.log('[ChatPanel] Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeConsultation?.id, currentUser?.id, addMessage, onlineDoctors, setOnlineDoctors]);

  // ── Auto-scroll to bottom ──────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Start a chat with a doctor ─────────────────────────────────────────

  const handleStartChat = async (doctor: DoctorWithProfile) => {
    if (!currentUser) return;

    // Check if there's an existing active consultation
    const existing = getConsultationForDoctor(doctor.doctorProfile?.id || doctor.id);
    if (existing) {
      await openConsultation(existing);
      return;
    }

    // Create a new consultation
    const doctorProfileId = doctor.doctorProfile?.id;
    if (!doctorProfileId) return;

    setCreatingConsultation(doctor.id);
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentUser.id,
          doctorId: doctorProfileId,
          type: 'chat',
        }),
      });

      const data = await res.json();
      if (data.consultation) {
        // Add welcome message locally
        const welcomeMessage: Message = {
          id: 'welcome-' + Date.now(),
          consultationId: data.consultation.id,
          senderId: 'system',
          content: 'Selamat datang di MedikaLink! Dokter akan segera merespons pesan Anda.',
          type: 'text',
          status: 'read',
          createdAt: new Date().toISOString(),
        };

        const newConsultation: Consultation = {
          ...data.consultation,
          messages: [welcomeMessage],
        };

        setConsultations([newConsultation, ...consultations]);
        setActiveConsultation(newConsultation);
        setMessages([welcomeMessage]);
        setSelectedChatDoctor(doctor);

        // Join Socket.IO room
        socketRef.current?.emit('join-consultation', {
          consultationId: data.consultation.id,
          userId: currentUser.id,
          role: currentUser.role,
        });

        // Show chat area on mobile
        setShowChatArea(true);
      }
    } catch (err) {
      console.error('Failed to create consultation:', err);
    } finally {
      setCreatingConsultation(null);
    }
  };

  // ── Open an existing consultation ──────────────────────────────────────

  const openConsultation = async (consultation: Consultation) => {
    setActiveConsultation(consultation);
    setSelectedChatDoctor(null);

    // Find doctor info from store
    const doctorUser = doctors.find(
      (d) => d.doctorProfile?.id === consultation.doctorId
    );
    if (doctorUser) {
      setSelectedChatDoctor(doctorUser);
    }

    // Join Socket.IO room
    if (currentUser) {
      socketRef.current?.emit('join-consultation', {
        consultationId: consultation.id,
        userId: currentUser.id,
        role: currentUser.role,
      });
    }

    // Fetch messages
    await fetchMessages(consultation.id);

    // Mark messages as read
    if (currentUser) {
      socketRef.current?.emit('message-read', {
        consultationId: consultation.id,
        userId: currentUser.id,
      });
    }

    // Show chat area on mobile
    setShowChatArea(true);
  };

  // ── Send a message ─────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConsultation || !currentUser) return;

    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    // Stop typing
    socketRef.current?.emit('stop-typing', {
      consultationId: activeConsultation.id,
      userId: currentUser.id,
    });

    try {
      socketRef.current?.emit('send-message', {
        consultationId: activeConsultation.id,
        senderId: currentUser.id,
        content,
        type: 'text',
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      messageInputRef.current?.focus();
    }
  };

  // ── Handle typing ──────────────────────────────────────────────────────

  const handleTyping = (value: string) => {
    setMessageInput(value);

    if (!activeConsultation || !currentUser) return;

    // Emit typing event
    socketRef.current?.emit('typing', {
      consultationId: activeConsultation.id,
      userId: currentUser.id,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', {
        consultationId: activeConsultation!.id,
        userId: currentUser!.id,
      });
    }, 2000);
  };

  // ── Handle key press ───────────────────────────────────────────────────

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Go back to list (mobile) ───────────────────────────────────────────

  const handleBackToList = () => {
    setShowChatArea(false);
    // Leave current consultation room
    if (activeConsultation && currentUser) {
      socketRef.current?.emit('leave-consultation', {
        consultationId: activeConsultation.id,
        userId: currentUser.id,
      });
    }
  };

  // ── Get the doctor for the active consultation ─────────────────────────

  const activeDoctor = activeConsultation
    ? doctors.find((d) => d.doctorProfile?.id === activeConsultation.doctorId)
    : selectedChatDoctor;

  // ── Render message status icon ─────────────────────────────────────────

  const renderMessageStatus = (status: string, isOwn: boolean) => {
    if (!isOwn) return null;
    if (status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-primary" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  // ── Render: Doctor List Card ───────────────────────────────────────────

  const renderDoctorCard = (doctor: DoctorWithProfile) => {
    const profile = doctor.doctorProfile;
    if (!profile) return null;

    const existingConsultation = getConsultationForDoctor(profile.id);
    const online = isDoctorOnline(doctor.id);
    const isCreating = creatingConsultation === doctor.id;
    const lastMessage = existingConsultation?.messages?.[existingConsultation.messages.length - 1];

    return (
      <div
        key={doctor.id}
        className={cn(
          'p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer group',
          activeConsultation?.doctorId === profile.id && 'ring-2 ring-primary/30 bg-primary/5'
        )}
        onClick={() => {
          if (existingConsultation) {
            openConsultation(existingConsultation);
          }
        }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={doctor.avatar || undefined} alt={doctor.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {doctor.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                online ? 'bg-emerald-500 pulse-online' : 'bg-gray-400'
              )}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">{doctor.name}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                  {SPECIALIZATION_LABELS[profile.specialization] || profile.specialization}
                </Badge>
              </div>
              {lastMessage && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatTime(lastMessage.createdAt)}
                </span>
              )}
            </div>

            {/* Rating & Fee */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-[11px] font-medium text-foreground">{profile.rating.toFixed(1)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatFee(profile.consultationFee)}
              </span>
            </div>

            {/* Last message preview or start button */}
            {existingConsultation ? (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {lastMessage?.content || 'Belum ada pesan'}
              </p>
            ) : (
              <Button
                size="sm"
                className="mt-2 h-7 text-xs font-medium"
                disabled={isCreating}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartChat(doctor);
                }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Memulai...
                  </>
                ) : (
                  'Mulai Chat'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Chat Header ────────────────────────────────────────────────

  const renderChatHeader = () => {
    if (!activeConsultation && !selectedChatDoctor) return null;

    const doctor = activeDoctor;
    if (!doctor) return null;

    const profile = doctor.doctorProfile;
    const online = isDoctorOnline(doctor.id);

    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {/* Back button (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={handleBackToList}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Doctor avatar & info */}
        <div className="relative shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={doctor.avatar || undefined} alt={doctor.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {doctor.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
              online ? 'bg-emerald-500' : 'bg-gray-400'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{doctor.name}</h3>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-[11px] font-medium',
                online ? 'text-emerald-600' : 'text-muted-foreground'
              )}
            >
              {online ? 'Online' : 'Offline'}
            </span>
            {profile && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {SPECIALIZATION_LABELS[profile.specialization] || profile.specialization}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Render: Messages Area ──────────────────────────────────────────────

  const renderMessages = () => {
    if (!activeConsultation) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Pilih Dokter</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Pilih dokter dari daftar untuk memulai konsultasi chat
            </p>
          </div>
        </div>
      );
    }

    if (isLoadingMessages) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1">
        {messages.map((msg, index) => {
          const isOwn = msg.senderId === currentUser?.id;
          const isSystem = msg.senderId === 'system';
          const prevMsg = messages[index - 1];
          const showDateSeparator = index === 0 || (prevMsg && isDifferentDay(msg.createdAt, prevMsg.createdAt));

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              )}

              {/* System message */}
              {isSystem ? (
                <div className="flex items-center justify-center py-2">
                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg text-center max-w-[85%]">
                    {msg.content}
                  </span>
                </div>
              ) : (
                /* Regular message */
                <div
                  className={cn(
                    'flex msg-animate',
                    isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[75%] sm:max-w-[65%] rounded-2xl px-3.5 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border text-card-foreground rounded-bl-md'
                    )}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    <div
                      className={cn(
                        'flex items-center gap-1 mt-1',
                        isOwn ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px]',
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                      {renderMessageStatus(msg.status, isOwn)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start msg-animate">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    );
  };

  // ── Render: Message Input ──────────────────────────────────────────────

  const renderMessageInput = () => {
    if (!activeConsultation) return null;

    return (
      <div className="border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              value={messageInput}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ketik pesan..."
              className="h-9 text-sm rounded-full border-border bg-background pr-2"
              disabled={!activeConsultation}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <Mic className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            className="shrink-0 h-9 w-9 rounded-full"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ── Render: Left Panel ─────────────────────────────────────────────────

  const renderLeftPanel = () => (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-card h-full',
        showChatArea ? 'hidden lg:flex' : 'flex'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-foreground text-base">Chat Dokter</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Konsultasi dengan dokter pilihan Anda
        </p>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari dokter..."
            className="h-8 text-xs pl-8 rounded-lg bg-background"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 pb-2">
        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200',
                activeFilter === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Doctor list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {isLoadingDoctors ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Tidak ada dokter ditemukan</p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => renderDoctorCard(doctor as DoctorWithProfile))
        )}
      </div>
    </div>
  );

  // ── Render: Right Panel ────────────────────────────────────────────────

  const renderRightPanel = () => (
    <div
      className={cn(
        'flex flex-col h-full bg-background',
        !showChatArea ? 'hidden lg:flex' : 'flex'
      )}
    >
      {renderChatHeader()}
      {renderMessages()}
      {renderMessageInput()}
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Left panel - Doctor/Conversation list */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0">
        {renderLeftPanel()}
      </div>

      {/* Right panel - Chat area */}
      <div className="flex-1">
        {renderRightPanel()}
      </div>
    </div>
  );
}
