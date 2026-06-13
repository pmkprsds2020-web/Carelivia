'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
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
} from 'lucide-react';

type UserRole = 'doctor' | 'patient' | 'admin' | 'pharmacist' | 'homecare_staff';

interface UserEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  doctor: { label: 'Dokter', icon: Stethoscope, color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/10' },
  patient: { label: 'Pasien', icon: Heart, color: 'text-[#6DB8A8]', bgColor: 'bg-[#6DB8A8]/10' },
  admin: { label: 'Admin', icon: Shield, color: 'text-[#D9B26F]', bgColor: 'bg-[#D9B26F]/10' },
  pharmacist: { label: 'Apoteker', icon: Package, color: 'text-[#2D8C7A]', bgColor: 'bg-[#2D8C7A]/10' },
  homecare_staff: { label: 'Petugas HC', icon: Truck, color: 'text-[#6DB8A8]', bgColor: 'bg-[#6DB8A8]/10' },
};

// Demo user data
const demoUsers: UserEntry[] = [
  { id: 'doc-sarah', name: 'dr. Sarah Wijaya', email: 'sarah@carelivia.id', phone: '081234567001', role: 'doctor', isActive: true, joinedAt: '2024-01-15' },
  { id: 'doc-ahmad', name: 'dr. Ahmad Rizki', email: 'ahmad@carelivia.id', phone: '081234567002', role: 'doctor', isActive: true, joinedAt: '2024-02-20' },
  { id: 'doc-lisa', name: 'dr. Lisa Permata', email: 'lisa@carelivia.id', phone: '081234567003', role: 'doctor', isActive: true, joinedAt: '2024-03-10' },
  { id: 'doc-dewi', name: 'dr. Dewi Sartika', email: 'dewi@carelivia.id', phone: '081234567004', role: 'doctor', isActive: false, joinedAt: '2024-04-05' },
  { id: 'doc-budi', name: 'drg. Budi Santoso', email: 'budi@carelivia.id', phone: '081234567005', role: 'doctor', isActive: true, joinedAt: '2024-05-12' },
  { id: 'pat-rina', name: 'Rina Wulandari', email: 'rina@mail.com', phone: '081234567890', role: 'patient', isActive: true, joinedAt: '2024-01-20' },
  { id: 'pat-doni', name: 'Doni Pratama', email: 'doni@mail.com', phone: '081234567891', role: 'patient', isActive: true, joinedAt: '2024-02-15' },
  { id: 'pat-maya', name: 'Maya Sari', email: 'maya@mail.com', phone: '081234567892', role: 'patient', isActive: true, joinedAt: '2024-03-22' },
  { id: 'pat-siti', name: 'Siti Aminah', email: 'siti@mail.com', phone: '081234567893', role: 'patient', isActive: false, joinedAt: '2024-04-10' },
  { id: 'pat-joko', name: 'Joko Widodo', email: 'joko@mail.com', phone: '081234567894', role: 'patient', isActive: true, joinedAt: '2024-05-08' },
  { id: 'admin-carelivia', name: 'Admin CareLivia', email: 'admin@carelivia.id', phone: '081200000000', role: 'admin', isActive: true, joinedAt: '2024-01-01' },
  { id: 'pharm-1', name: 'Apoteker Andi', email: 'andi@carelivia.id', phone: '081234567010', role: 'pharmacist', isActive: true, joinedAt: '2024-03-01' },
  { id: 'hc-1', name: 'Petugas Rina HC', email: 'rinahc@carelivia.id', phone: '081234567011', role: 'homecare_staff', isActive: true, joinedAt: '2024-04-01' },
];

export function AdminUsersPanel() {
  const { currentUser } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [users, setUsers] = useState<UserEntry[]>(demoUsers);

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

  const toggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
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
        <Button className="gap-2 bg-[#2D8C7A] hover:bg-[#1F6B5C] shrink-0">
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
                <p className="text-2xl font-bold text-foreground">{stats.byRole('doctor')}</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.byRole('patient')}</p>
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
            {filteredUsers.length === 0 ? (
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
                          <Phone className="w-3 h-3" /> {user.phone}
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
                        title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {user.isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Hapus">
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
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
