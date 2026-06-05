'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  Droplets,
  AlertTriangle,
  Heart,
  Ruler,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
} from 'lucide-react';

export function ProfilePanel() {
  const { currentUser, setCurrentUser } = useStore();
  const { toast } = useToast();

  // Profile form state
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [nik, setNik] = useState(currentUser?.nik || '');
  const [bpjsNumber, setBpjsNumber] = useState(currentUser?.bpjsNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [address, setAddress] = useState(currentUser?.address || '');

  // Medical info state
  const [bloodType, setBloodType] = useState(currentUser?.patientProfile?.bloodType || '');
  const [allergies, setAllergies] = useState(currentUser?.patientProfile?.allergies || '');
  const [medicalHistory, setMedicalHistory] = useState(currentUser?.patientProfile?.medicalHistory || '');
  const [height, setHeight] = useState(String(currentUser?.patientProfile?.height || ''));
  const [weight, setWeight] = useState(String(currentUser?.patientProfile?.weight || ''));

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSaveProfile = () => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name,
        phone,
        nik,
        bpjsNumber,
        dateOfBirth,
        gender,
        address,
        patientProfile: {
          ...currentUser.patientProfile!,
          bloodType,
          allergies,
          medicalHistory,
          height: height ? parseInt(height) : undefined,
          weight: weight ? parseInt(weight) : undefined,
        },
      });
    }
    toast({
      title: 'Profil Diperbarui',
      description: 'Data profil Anda berhasil disimpan',
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Semua field password harus diisi', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Password baru tidak cocok', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'Password baru minimal 8 karakter', variant: 'destructive' });
      return;
    }
    toast({ title: 'Password Diperbarui', description: 'Password Anda berhasil diubah' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Avatar Section */}
      <Card className="border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                {name.charAt(0) || 'P'}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{name || 'Pasien'}</h2>
              <p className="text-sm text-muted-foreground">{currentUser?.email || 'email@example.com'}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 text-[10px]">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Terverifikasi
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Form */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Data Pribadi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" placeholder="Nama lengkap" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" value={currentUser?.email || ''} className="pl-10 bg-muted" readOnly disabled />
              </div>
              <p className="text-[10px] text-muted-foreground">Email tidak dapat diubah</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor HP</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nik">NIK</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="nik" value={nik} onChange={(e) => setNik(e.target.value)} className="pl-10" placeholder="16 digit NIK" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpjs">Nomor BPJS</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="bpjs" value={bpjsNumber} onChange={(e) => setBpjsNumber(e.target.value)} className="pl-10" placeholder="Nomor BPJS Kesehatan" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Tanggal Lahir</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Jenis Kelamin</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10 min-h-[80px]" placeholder="Alamat lengkap" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Info + Password */}
        <div className="space-y-6">
          {/* Medical Info */}
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Informasi Medis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Golongan Darah</Label>
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger>
                    <Droplets className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Pilih golongan darah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Alergi Obat</Label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="allergies"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="pl-10"
                    placeholder="Contoh: Penisilin, Sulfa (pisahkan dengan koma)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Riwayat Penyakit</Label>
                <Textarea
                  id="medicalHistory"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Contoh: Diabetes, Hipertensi (pisahkan dengan koma)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="height">Tinggi Badan (cm)</Label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="pl-10" placeholder="165" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Berat Badan (kg)</Label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="pl-10" placeholder="62" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button className="w-full" size="lg" onClick={handleSaveProfile}>
            <Save className="w-4 h-4 mr-2" />
            Simpan Perubahan
          </Button>

          {/* Change Password */}
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Ubah Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Password saat ini"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Password baru (min. 8 karakter)"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleChangePassword}>
                <Lock className="w-4 h-4 mr-2" />
                Ubah Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
