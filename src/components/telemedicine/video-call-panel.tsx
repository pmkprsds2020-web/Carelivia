'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { ConsultationType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Video,
  Mic,
  MicOff,
  Monitor,
  MessageCircle,
  PhoneOff,
  VideoOff,
  Phone,
  Clock,
  Loader2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CallState = 'idle' | 'calling' | 'active' | 'ended';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function VideoCallPanel() {
  const { doctors, currentUser, setActivePanel } = useStore();
  const { toast } = useToast();

  const [callState, setCallState] = useState<CallState>('idle');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultationType, setConsultationType] = useState<ConsultationType>('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Timer for active call
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  const handleStartCall = useCallback(() => {
    if (!selectedDoctorId) {
      toast({ title: 'Pilih Dokter', description: 'Silakan pilih dokter terlebih dahulu' });
      return;
    }
    setCallState('calling');
    setCallDuration(0);
    setDoctorNotes('');
    setChatMessages([]);

    // Simulate connecting
    setTimeout(() => {
      setCallState('active');
      setChatMessages([
        {
          sender: 'system',
          text: 'Konsultasi dimulai. Dokter akan segera bergabung.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 2500);
  }, [selectedDoctorId, toast]);

  const handleEndCall = useCallback(() => {
    setCallState('ended');
    toast({
      title: 'Konsultasi Selesai',
      description: `Durasi: ${formatDuration(callDuration)}`,
    });
  }, [callDuration, toast]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const text = formData.get('chatInput') as string;
      if (!text.trim()) return;
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'patient',
          text: text.trim(),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      (e.target as HTMLFormElement).reset();
    },
    []
  );

  const handleFinish = useCallback(() => {
    setCallState('idle');
    setSelectedDoctorId('');
    setCallDuration(0);
    setDoctorNotes('');
    setActivePanel('home');
  }, [setActivePanel]);

  // ===================== IDLE STATE =====================
  if (callState === 'idle') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Card className="border-0 carelivia-gradient overflow-hidden">
          <CardContent className="p-8 md:p-12 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Mulai Video Call
            </h2>
            <p className="text-white/80 text-sm md:text-base max-w-md mx-auto">
              Konsultasikan keluhan kesehatan Anda langsung dengan dokter melalui video call atau audio call
            </p>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg">Pengaturan Konsultasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Dokter</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih dokter..." />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      <span className="flex items-center gap-2">
                        {doctor.name}
                        {doctor.doctorProfile && (
                          <Badge variant="secondary" className="text-[10px] ml-1">
                            {doctor.doctorProfile.specialization}
                          </Badge>
                        )}
                        {doctor.doctorProfile?.isOnline && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDoctor && (
              <Card className="bg-muted/50 border-0">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedDoctor.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{selectedDoctor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDoctor.doctorProfile?.specialization || 'Umum'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      Rp {new Intl.NumberFormat('id-ID').format(selectedDoctor.doctorProfile?.consultationFee || 0)}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        selectedDoctor.doctorProfile?.isOnline
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {selectedDoctor.doctorProfile?.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Tipe Konsultasi</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={consultationType === 'video' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-3 flex flex-col items-center gap-2',
                    consultationType === 'video' && 'ring-2 ring-primary'
                  )}
                  onClick={() => setConsultationType('video')}
                >
                  <Video className="w-6 h-6" />
                  <span className="text-sm font-medium">Video Call</span>
                </Button>
                <Button
                  variant={consultationType === 'audio' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-3 flex flex-col items-center gap-2',
                    consultationType === 'audio' && 'ring-2 ring-primary'
                  )}
                  onClick={() => setConsultationType('audio')}
                >
                  <Phone className="w-6 h-6" />
                  <span className="text-sm font-medium">Audio Call</span>
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleStartCall}
              disabled={!selectedDoctorId}
            >
              <Video className="w-4 h-4 mr-2" />
              Mulai {consultationType === 'video' ? 'Video Call' : 'Audio Call'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===================== CALLING STATE =====================
  if (callState === 'calling') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative mx-auto">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl mx-auto">
              {selectedDoctor?.name?.charAt(0) || 'D'}
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Menghubungi {selectedDoctor?.name || 'Dokter'}...
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Mohon tunggu, sedang menghubungkan
            </p>
          </div>
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full px-8"
            onClick={() => setCallState('idle')}
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Batalkan
          </Button>
        </div>
      </div>
    );
  }

  // ===================== ENDED STATE =====================
  if (callState === 'ended') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Card className="border-0">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Konsultasi Selesai
            </h2>
            <p className="text-muted-foreground">
              {selectedDoctor?.name || 'Dokter'}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Durasi: {formatDuration(callDuration)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg">Catatan Konsultasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Tulis catatan dari konsultasi Anda..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              rows={4}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActivePanel('medical-records')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Lihat Resep
              </Button>
              <Button className="w-full" onClick={handleFinish}>
                Selesai
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===================== ACTIVE CALL STATE =====================
  return (
    <div className="relative min-h-[80vh] bg-gray-900 dark:bg-gray-950 rounded-lg overflow-hidden">
      {/* Main video area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white/60">
          {consultationType === 'video' ? (
            <>
              <Video className="w-16 h-16 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">Video Feed</p>
              <p className="text-sm">dr. {selectedDoctor?.name || 'Dokter'}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3">
                {selectedDoctor?.name?.charAt(0) || 'D'}
              </div>
              <p className="text-lg font-medium">{selectedDoctor?.name || 'Dokter'}</p>
              <p className="text-sm text-white/40">Audio Call</p>
            </>
          )}
        </div>
      </div>

      {/* Self-view window */}
      {consultationType === 'video' && (
        <div className="absolute top-4 right-4 w-28 h-36 md:w-36 md:h-48 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 z-10">
          <div className="w-full h-full flex items-center justify-center text-white/40">
            {isVideoOff ? <VideoOff className="w-8 h-8" /> : <Video className="w-8 h-8" />}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
              {selectedDoctor?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <p className="font-semibold text-sm">{selectedDoctor?.name || 'Dokter'}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-xs text-white/80">Aktif</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-white/80" />
            <span className="font-mono text-sm text-white">{formatDuration(callDuration)}</span>
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'rounded-full h-12 w-12',
              isMuted
                ? 'bg-white/20 text-red-400 hover:bg-white/30 hover:text-red-300'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {consultationType === 'video' && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full h-12 w-12',
                isVideoOff
                  ? 'bg-white/20 text-red-400 hover:bg-white/30 hover:text-red-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
              onClick={() => setIsVideoOff(!isVideoOff)}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'rounded-full h-12 w-12',
              isScreenSharing
                ? 'bg-primary/80 text-white hover:bg-primary/70'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'rounded-full h-12 w-12',
              showChat
                ? 'bg-primary/80 text-white hover:bg-primary/70'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
            onClick={() => setShowChat(!showChat)}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-12 w-12 bg-red-600 hover:bg-red-700"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Side chat panel */}
      {showChat && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-md border-l border-white/10 z-20 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Chat</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/60 hover:text-white"
                onClick={() => setShowChat(false)}
              >
                &times;
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg p-2.5 text-sm max-w-[85%]',
                  msg.sender === 'patient'
                    ? 'ml-auto bg-primary text-white'
                    : msg.sender === 'system'
                      ? 'mx-auto bg-white/10 text-white/60 text-center text-xs'
                      : 'bg-white/10 text-white'
                )}
              >
                <p>{msg.text}</p>
                <p className={cn('text-[10px] mt-1', msg.sender === 'patient' ? 'text-white/70' : 'text-white/40')}>
                  {msg.time}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                name="chatInput"
                className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder:text-white/40 focus:ring-1 focus:ring-primary"
                placeholder="Ketik pesan..."
                autoComplete="off"
              />
              <Button type="submit" size="sm" className="px-3">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
