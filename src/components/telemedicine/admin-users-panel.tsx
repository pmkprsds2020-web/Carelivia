'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  UserPlus,
  Stethoscope,
  Heart,
  Shield,
  Package,
  Truck,
  MoreHorizontal,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

// Real DB role values (see supabase/schema.sql: profiles.role check
// constraint) — 'Apoteker'/'Petugas HC' aren't distinct profile roles in
// the current schema (pharmacists/home-care staff are identified by having
// a row in a separate table, not a dedicated `profiles.role` value), so
// this list intentionally only covers what the database can actually say.
type UserRole = 'Admin' | 'Dokter' | 'Perawat' | 'Caregiver' | 'Pasien';

interface UserEntry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  Dokter: { label: 'Dokter', icon: Stethoscope, color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/10' },
  Pasien: { label: 'Pasien', icon: Heart, color: 'text-[#6DB8A8]', bgColor: 'bg-[#6DB8A8]/10' },
  Admin: { label: 'Admin', icon: Shield, color: 'text-[#D9B26F]', bgColor: 'bg-[#D9B26F]/10' },
  Perawat: { label: 'Perawat', icon: Package, color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/10' },
  Caregiver: { label: 'Caregiver', icon: Truck, color: 'text-[#6DB8A8]', bgColor: 'bg-[#6DB8A8]/10' },
};

export function AdminUsersPanel() {
  const { currentUser } = useStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  // NOTE: the hardcoded `demoUsers` array (13 fake people, including the
  // same placeholder "dr. Sarah Wijaya" found elsewhere in the app) has
  // been removed. Real users now load from GET /api/admin/users, which
  // reads the actual `profiles` table.
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && Array.isArray(data?.users)) {
        setUsers(data.users);
      } else {
        toast({ title: 'Gagal memuat pengguna', description: data?.details || 'Terjadi kesalahan.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('[admin-users-panel] loadUsers failed:', err);
      toast({ title: 'Gagal memuat pengguna', description: 'Periksa koneksi Anda.', variant: 'destructive' });
    } finally {
      setUsersLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchQuery === '' || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, filterRole]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const byRole = (role: UserRole) => users.filter(u => u.role === role).length;
    return { total, active, byRole };
  }, [users]);

  const toggleUserStatus = async (userId: string) => {
    setTogglingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.user) {
        throw new Error(data?.details || data?.error || 'Gagal mengubah status');
      }
      setUsers(prev => prev.map(u => (u.id === userId ? data.user : u)));
      toast({
        title: data.user.isActive ? 'Pengguna Diaktifkan' : 'Pengguna Dinonaktifkan',
        description: data.user.name,
      });
    } catch (err) {
      toast({
        title: 'Gagal mengubah status',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kelola Pengguna</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola akun dokter, pasien, dan staf pada platform CareLivia
          </p>
        </div>
        <Button
          className="gap-2 bg-[#2D8C7A] hover:bg-[#1F6B5C] shrink-0"
          disabled
          title="Pembuatan pengguna baru lewat panel ini belum tersedia — gunakan halaman registrasi/login untuk membuat akun."
        >
          <UserPlus className="w-4 h-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2D8C7A]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#2D8C7A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Pengguna</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2D8C7A]/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-[#2D8C7A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.byRole('Dokter')}</p>
                <p className="text-xs text-muted-foreground">Dokter</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6DB8A8]/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#6DB8A8]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.byRole('Pasien')}</p>
                <p className="text-xs text-muted-foreground">Pasien</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterRole === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRole('all')}
                className={filterRole === 'all' ? 'bg-[#2D8C7A] hover:bg-[#1F6B5C]' : ''}
              >
                Semua
              </Button>
              {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                const config = roleConfig[role];
                return (
                  <Button
                    key={role}
                    variant={filterRole === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterRole(role)}
                    className={filterRole === role ? 'bg-[#2D8C7A] hover:bg-[#1F6B5C]' : ''}
                  >
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Pengguna ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {usersLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Memuat pengguna...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Tidak ada pengguna ditemukan</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => {
                const config = roleConfig[user.role];
                const Icon = config.icon;
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">{user.name}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color} border-current/20`}>
                          {config.label}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 border-red-200">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {user.phone || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleUserStatus(user.id)}
                        disabled={togglingId === user.id}
                        title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {togglingId === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Edit profil pengguna belum tersedia di panel ini">
                        <Edit2 className="w-4 h-4 text-muted-foreground/40" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Hapus akun belum tersedia di panel ini — nonaktifkan sebagai gantinya">
                        <Trash2 className="w-4 h-4 text-muted-foreground/40" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
