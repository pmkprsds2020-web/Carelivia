# 🏥 MedikaLink — Project Resume Prompt

> Gunakan prompt ini untuk melanjutkan pengembangan project MedikaLink Telemedicine. Copy seluruh isi file ini sebagai context untuk session berikutnya.

---

## 📋 Project Overview

**Nama Aplikasi:** MedikaLink — Platform Telemedicine Terintegrasi SATUSEHAT
**Framework:** Next.js 16 (App Router) + TypeScript 5
**Styling:** Tailwind CSS 4 + shadcn/ui (New York style) + Framer Motion
**Database:** Prisma ORM (SQLite) — file: `db/custom.db`
**State Management:** Zustand (client state)
**Bahasa UI:** Bahasa Indonesia
**Port:** 3000 (Next.js), 3003 (Socket.IO chat service)

---

## 🏗️ Arsitektur & Struktur

```
src/
├── app/
│   ├── page.tsx                    # Entry point — TelemedicineApp component
│   └── api/                        # API routes (Prisma-based)
│       ├── route.ts                # Health check
│       ├── seed/route.ts           # DB seeding endpoint
│       ├── dashboard/route.ts      # Dashboard stats API
│       ├── doctors/route.ts        # Doctors list API
│       ├── medicines/route.ts      # Medicines catalog API
│       ├── consultations/route.ts  # Consultations CRUD API
│       │   └── [id]/messages/route.ts
│       ├── medical-records/route.ts # Medical records API
│       ├── prescriptions/route.ts  # Prescriptions API
│       ├── homecare/route.ts       # Home care services & bookings API
│       └── notifications/route.ts  # Notifications API
├── components/
│   ├── ui/                         # shadcn/ui components (pre-installed)
│   └── telemedicine/               # Business components
│       ├── login-page.tsx          # Login dengan role selection + seed data
│       ├── sidebar.tsx             # Sidebar navigasi (role-based)
│       ├── home-dashboard.tsx      # Dashboard utama pasien/dokter
│       ├── chat-panel.tsx          # Chat + e-resep + rekam medis dialog
│       ├── video-call-panel.tsx    # Video/audio call UI
│       ├── pharmacy-panel.tsx      # Apotek online + keranjang + checkout
│       ├── homecare-panel.tsx      # Home care booking + tracking
│       ├── medical-records.tsx     # Rekam medis (Dokter & Pasien view)
│       ├── doctor-panel.tsx        # Panel dokter 6-tab
│       ├── pharmacist-panel.tsx    # Panel apoteker 4-tab
│       ├── homecare-staff-panel.tsx # Panel petugas home care 3-tab
│       ├── admin-dashboard.tsx     # Admin dashboard + charts
│       ├── admin-pricing-panel.tsx # Kelola harga & tarif (admin)
│       ├── notifications-panel.tsx # Notifikasi
│       ├── payments-panel.tsx      # Pembayaran (QRIS, e-wallet, VA)
│       ├── reports-panel.tsx       # Laporan & analitik
│       └── profile-panel.tsx       # Profil pengguna
├── lib/
│   ├── store.ts                    # Zustand global store
│   ├── types.ts                    # TypeScript type definitions
│   ├── db.ts                       # Prisma client instance
│   └── utils.ts                    # Utility functions (cn, etc.)
└── hooks/
    └── use-toast.ts                # Toast notification hook

mini-services/
└── chat-service/                   # Socket.IO service (port 3003)
    ├── package.json
    └── index.ts                    # WebSocket events

prisma/
└── schema.prisma                   # Database schema (17 models)
```

---

## 👥 Role-Based Access Control (RBAC)

### 3 Role Utama dengan Demo Accounts:

| Role | ID | Nama | Email | Spesialisasi |
|------|-----|------|-------|-------------|
| **Dokter** | `doc-sarah` | dr. Sarah Wijaya | sarah@medikalinku.id | Umum |
| | `doc-ahmad` | dr. Ahmad Rizki | ahmad@medikalinku.id | Anak |
| | `doc-lisa` | dr. Lisa Permata | lisa@medikalinku.id | Penyakit Dalam |
| | `doc-dewi` | dr. Dewi Sartika | dewi@medikalinku.id | Kebidanan |
| | `doc-budi` | drg. Budi Santoso | budi@medikalinku.id | Gigi |
| **Pasien** | `pat-rina` | Rina Wulandari | rina@mail.com | — |
| | `pat-doni` | Doni Pratama | doni@mail.com | — |
| | `pat-maya` | Maya Sari | maya@mail.com | — |
| | `pat-siti` | Siti Aminah | siti@mail.com | — |
| | `pat-joko` | Joko Widodo | joko@mail.com | — |
| **Admin** | `admin-medika` | Admin MedikaLink | admin@medikalinku.id | — |

### Sidebar Navigation per Role:
- **Pasien:** Home, Chat, Video Call, Apotek, Home Care, Rekam Medis, Notifikasi, Pembayaran, Profil
- **Dokter:** Home, Chat, Panel Dokter, Rekam Medis, Notifikasi, Profil
- **Admin:** Home, Admin Dashboard, Kelola Harga, Laporan, Notifikasi, Profil

---

## 🗄️ Database Schema (Prisma — 17 Models)

### Core Models:
- **User** — id, email, name, role (patient/doctor/pharmacist/homecare_staff/admin), nik, bpjsNumber, isVerified
- **PatientProfile** — bloodType, allergies, medicalHistory, height, weight, emergencyContact
- **DoctorProfile** — specialization, licenseNumber, hospital, rating, consultationFee, isOnline, isAvailable
- **PharmacistProfile** — licenseNumber, pharmacyName
- **HomeCareStaff** — certification, latitude, longitude, isAvailable, currentStatus

### Transaction Models:
- **Consultation** — patientId, doctorId, type (chat/video/audio), status (waiting/active/completed/cancelled)
- **Message** — consultationId, senderId, content, type (text/image/file/voice/lab_result), status
- **Prescription** — consultationId, doctorId, patientId, status (active/fulfilled/expired/paid), notes
- **PrescriptionItem** — medicineName, dosage, quantity, frequency, duration, instructions, price
- **MedicalRecord** — patientId, consultationId, diagnosis, symptoms, treatment, labResults, notes, recordDate, status (draft/selesai/ditinjau), rmNumber
- **Medicine** — name, genericName, category (resep/bebas/vitamin/alat_kesehatan), price, stock
- **Order** + **OrderItem** — pharmacy orders with tracking
- **HomeCareService** — name, category, price, duration
- **HomeCareBooking** — patientId, staffId, serviceId, scheduledAt, address, status, GPS tracking
- **Payment** — amount, method (qris/bank_transfer/va/gopay/ovo/dana/shopeepay), status, type
- **DoctorEarning** — doctorId, amount, status
- **Notification** — userId, type, isRead
- **Article** — health articles
- **AuditLog** — action tracking
- **Schedule** — doctor schedules (dayOfWeek, startTime, endTime)

---

## 🔑 Fitur Utama yang Sudah Diimplementasi

### 1. 🔐 Login System
- Role selection: Dokter / Pasien / Admin
- Demo account cards dengan animasi Framer Motion
- Auto-seed data saat login (`seedDoctorData`, `seedPatientData`)
- Seed data menciptakan konsultasi, rekam medis, dan resep obat demo

### 2. 💬 Chat Dokter (chat-panel.tsx)
- Daftar dokter dengan filter spesialisasi (Umum, Anak, Penyakit Dalam, Kebidanan, Gigi)
- Search dokter by nama/spesialisasi
- Real-time chat dengan simulasi auto-reply dokter
- Typing indicator
- **E-Resep (E-Prescription):**
  - Dialog input resep obat dengan pilihan obat dropdown
  - Auto-fill dosage & price saat pilih obat
  - Kirim resep → muncul sebagai card di chat
  - Card menampilkan: nama obat, dosis, frekuensi, durasi, harga, total
  - Pasien bisa Bayar Sekarang atau Tambah ke Keranjang Apotek
  - Auto-prescription setelah 3+ pesan (simulasi)
- **Rekam Medis (Medical Record):**
  - Dialog input: Diagnosis, Gejala, Pengobatan, Catatan Dokter
  - Auto-generate Nomor RM (format: RM-YYYYMMDD-XXXX)
  - Status: Draft (jika belum lengkap) / Selesai (jika semua field terisi)
  - Otomatis terhubung ke konsultasi aktif
  - System message saat rekam medis disimpan
- **Patient View:** Lihat e-resep card dengan detail obat & harga, tombol bayar/checkout

### 3. 📹 Video Call (video-call-panel.tsx)
- Video/audio call UI dengan kontrol (mute, camera, end call)
- Call states: ringing, connected, ended
- Simulasi video call

### 4. 💊 Apotek Online (pharmacy-panel.tsx)
- Grid obat dengan kategori: Resep, Bebas, Vitamin, Alat Kesehatan
- Search & filter
- Keranjang belanja (add/remove/update quantity)
- Checkout dengan pilihan pembayaran
- 12 obat demo (Paracetamol, Amoxicillin, Omeprazole, dll)

### 5. 🏠 Home Care (homecare-panel.tsx)
- Daftar layanan: Perawatan Luka, Injeksi, Cek Kesehatan, Fisioterapi, Perawatan Lansia
- Booking dialog dengan date/time picker
- Tracking status booking (pending → confirmed → in_progress → completed)
- GPS tracking simulasi

### 6. 📋 Rekam Medis (medical-records.tsx) — **DUA VIEW**

**Doctor View (DoctorMedicalRecordsView):**
- Stats: Total Rekam Medis, Draft, Selesai, Ditinjau
- Tab 1 — Daftar Rekam Medis: Cards dengan Nama Pasien, Nomor RM, Diagnosis, Tanggal, Jenis Konsultasi, Status (Draft/Selesai/Ditinjau)
  - Search by nama/RM/diagnosis
  - Filter by status
  - Klik card → buka detail dialog
  - Detail dialog: gejala, pengobatan, catatan, resep terkait, ubah status
- Tab 2 — Timeline Pasien: Daftar pasien → klik → timeline riwayat konsultasi per pasien
  - Timeline dengan dot indicator (warna sesuai status)
  - Klik riwayat → buka detail rekam medis
- Tab 3 — Resep Obat: Daftar semua resep yang diberikan ke pasien
  - Detail obat: nama, dosis, frekuensi, durasi, harga, total
  - Status: Aktif, Dibayar, Ditebus

**Patient View (PatientMedicalRecordsView):**
- Sidebar info: Nama, Golongan Darah, Alergi, Riwayat Penyakit, Tinggi/Berat
- Quick stats: jumlah konsultasi & resep
- Tab 1 — Riwayat Konsultasi: Cards dengan diagnosis, dokter, tanggal
  - Expand: gejala, pengobatan, catatan, resep terkait
  - Data terbaru di atas (sorted by date descending)
- Tab 2 — Hasil Lab: Demo lab results (Darah Lengkap, Gula Darah, USG, dll)
- Tab 3 — Resep Obat: Daftar resep dengan detail obat & harga
  - Tombol: Bayar Sekarang, Keranjang Apotek
  - Data terbaru di atas (sorted by date descending)

**Data Flow Synchronization:**
- Saat dokter klik "Simpan Rekam Medis" di chat → data otomatis muncul di Rekam Medis
- Triple-matching strategy: consultationId → patientId → patient name key
- Map-based deduplication untuk mencegah React duplicate key errors
- Merge 3 sumber data: Zustand store (real-time) + embedded consultation + API
- Sorting: newest first (descending by date)

### 7. 🩺 Panel Dokter (doctor-panel.tsx)
- 6 tab: Dashboard, Konsultasi, Chat, E-Resep, Jadwal, Pendapatan
- Stats konsultasi, pasien, rating
- Daftar konsultasi aktif & selesai

### 8. 💊 Panel Apoteker (pharmacist-panel.tsx)
- 4 tab: Dashboard, Stok Obat, Resep Masuk, Pesanan
- Manajemen stok obat

### 9. 🏠 Panel Petugas Home Care (homecare-staff-panel.tsx)
- 3 tab: Jadwal, Navigasi GPS, Riwayat
- GPS tracking simulasi

### 10. 🛡️ Admin Dashboard (admin-dashboard.tsx)
- Stats: Total Pasien, Dokter, Konsultasi, Pendapatan
- Charts (recharts): Distribusi spesialisasi, tren bulanan
- Recent activity, top doctors

### 11. 💰 Admin Pricing (admin-pricing-panel.tsx)
- Kelola harga layanan home care & jasa dokter
- Edit harga dengan dialog
- Tambah/hapus layanan

### 12. 🔔 Notifikasi (notifications-panel.tsx)
- Filter tabs: Semua, Konsultasi, Farmasi, Pembayaran
- Mark as read, mark all read

### 13. 💳 Pembayaran (payments-panel.tsx)
- Summary cards: Total, Pending, Success
- Payment list dengan detail
- Payment dialog: QRIS, e-wallet (GoPay, OVO, DANA, ShopeePay), Virtual Account
- Invoice number generation

### 14. 📊 Laporan (reports-panel.tsx)
- Date range filter
- 4 charts: Pendapatan, Konsultasi, Kategori Obat, Home Care
- 3 data tables
- Export PDF/Excel (simulasi)

### 15. 👤 Profil (profile-panel.tsx)
- Edit profil, informasi medis, ubah password
- Avatar upload (simulasi)

---

## 🔄 Data Flow Architecture

### State Management:
```
Zustand Store (src/lib/store.ts)
├── currentUser          # User yang login
├── consultations[]      # Semua konsultasi
├── medicalRecords[]     # Semua rekam medis
├── prescriptions[]      # Semua resep obat
├── messages[]           # Pesan chat aktif
├── medicines[]          # Katalog obat
├── cart[]               # Keranjang apotek
├── payments[]           # Riwayat pembayaran
├── notifications[]      # Notifikasi
├── homeCareServices[]   # Layanan home care
├── homeCareBookings[]   # Booking home care
├── doctors[]            # Daftar dokter
└── activePanel          # Panel yang aktif
```

### Key Store Actions:
- `updateConsultation(id, data)` — Update konsultasi + sinkronisasi medicalRecord/prescription
- `addMedicalRecord(record)` — Tambah rekam medis baru
- `updateMedicalRecord(id, data)` — Update rekam medis (termasuk status)
- `addPrescription(prescription)` — Tambah resep obat
- `updatePrescriptionStatus(id, status)` — Update status resep (active → paid/fulfilled)
- `addToCart(item)` / `removeFromCart(id)` / `clearCart()` — Keranjang apotek

### Data Synchronization Pattern:
1. **Chat → Rekam Medis:** Doctor saves MR → `addMedicalRecord()` + `updateConsultation()` with MR reference
2. **Chat → E-Resep:** Doctor sends prescription → `addPrescription()` + `updateConsultation()` with prescription reference
3. **E-Resep → Rekam Medis:** Auto-create MR when prescription sent if no MR exists
4. **Rekam Medis View:** Merges Zustand store + embedded consultation data + API data with Map-based dedup
5. **Sorting:** All lists sorted newest first (descending by recordDate/createdAt)

### Medical Record Status Workflow:
```
Draft → Selesai → Ditinjau
  ↑         │
  └─────────┘  (bisa kembali ke Draft jika diedit)
```
- **Draft:** Belum semua field terisi
- **Selesai:** Semua field (diagnosis, gejala, pengobatan) terisi
- **Ditinjau:** Sedang ditinjau/review

---

## 🎨 Design System

### Warna Utama:
- **Primary:** Teal/Emerald (healthcare theme)
- **Accent:** Violet (prescriptions/pharmacy)
- **Warning:** Amber (drafts, alerts)
- **Success:** Emerald (completed, paid)
- **Destructive:** Red (errors, cancel)

### Badge System:
- Status Rekam Medis: Draft (amber), Selesai (emerald), Ditinjau (teal)
- Status Resep: Aktif (violet), Dibayar (emerald), Ditebus (emerald)
- Status Konsultasi: Aktif (emerald), Menunggu (amber), Selesai (gray)

### Layout:
- Responsive mobile-first
- Sidebar collapsible (expanded/collapsed)
- Sticky header with user avatar
- Sticky footer with SATUSEHAT branding
- Custom scrollbar styling

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/seed` | Seed database with demo data |
| GET | `/api/dashboard` | Dashboard stats, doctors, articles |
| GET | `/api/doctors` | List doctors with profiles |
| GET | `/api/medicines` | List medicines with search/filter |
| GET/POST | `/api/consultations` | List/create consultations |
| GET | `/api/consultations/[id]/messages` | Get messages for consultation |
| GET | `/api/medical-records` | List medical records |
| GET | `/api/prescriptions` | List prescriptions |
| GET/POST | `/api/homecare` | List services/bookings |
| GET | `/api/notifications?userId=xxx` | List notifications |

---

## 🔌 WebSocket (Socket.IO) — Port 3003

Events:
- `join-consultation` — Join consultation room
- `leave-consultation` — Leave consultation room
- `send-message` — Send chat message
- `typing` / `stop-typing` — Typing indicator
- `doctor-online` / `doctor-offline` — Doctor availability
- `consultation-started` / `consultation-ended` — Consultation lifecycle

Connection: `io("/?XTransformPort=3003")`

---

## 🐛 Bug Fixes yang Sudah Dilakukan

1. ✅ E-prescription card tidak terlihat di chat → Fixed rendering logic
2. ✅ Tombol-tombol tidak bisa diklik → Fixed event handlers & z-index
3. ✅ Chat simulation tidak bekerja → Added auto-reply + auto-prescription
4. ✅ Rekam medis dokter tidak menampilkan data → Added DoctorMedicalRecordsView with triple-matching
5. ✅ Riwayat konsultasi tidak update dari chat → Added updateConsultation sync
6. ✅ Loading spinner blocking UI → Changed to non-blocking data load
7. ✅ ID mismatch (API vs seed data) → Added patient name key matching
8. ✅ Data terbaru tidak di atas → Added descending sort by date
9. ✅ Duplicate React key error → Added Map-based deduplication across all merge operations
10. ✅ Admin pricing → Added CRUD for home care & doctor fees

---

## 📝 Fitur yang Belum/Todo

- [ ] Backend persistence untuk medical records & prescriptions (saat ini hanya di Zustand store)
- [ ] Real video call integration (WebRTC)
- [ ] SATUSEHAT Kemenkes API integration (FHIR compliance)
- [ ] Notifikasi real-time via WebSocket
- [ ] QR code untuk pembayaran QRIS (real payment gateway)
- [ ] File upload untuk lampiran chat (gambar, lab result)
- [ ] Flutter mobile app
- [ ] Audit log tracking
- [ ] Role pharmacist & homecare_staff login
- [ ] PDF export untuk rekam medis & laporan
- [ ] Email/SMS notification
- [ ] Multi-language support (EN/ID)

---

## 🚀 Cara Menjalankan

```bash
bun run dev                    # Start Next.js (port 3000)
cd mini-services/chat-service && bun run dev  # Start Socket.IO (port 3003)
bun run db:push                # Push Prisma schema ke SQLite
bun run lint                   # Check code quality
```

---

## 📌 Catatan Penting untuk Developer

1. **Single route only:** Hanya `/` route yang digunakan (src/app/page.tsx). Semua panel switching via Zustand `activePanel`.
2. **API via gateway:** Gunakan `?XTransformPort=PORT` untuk cross-service requests. JANGAN gunakan `http://localhost:PORT` langsung.
3. **WebSocket connection:** Selalu `io("/?XTransformPort=3003")`, path HARUS `/`.
4. **z-ai-web-dev-sdk:** HANYA untuk backend, JANGAN di client side.
5. **Medical record sync:** Data mengalir dari chat → Zustand store → Rekam Medis view. Pastikan `updateConsultation()` dipanggil setiap kali MR/resep diupdate.
6. **Deduplication:** Semua merge data menggunakan Map-based dedup by ID untuk mencegah React duplicate key warning.
7. **Indonesian UI:** Semua label, pesan, dan format menggunakan Bahasa Indonesia.
8. **Demo data:** Seed data otomatis saat login. Seed functions ada di `login-page.tsx`.
9. **Footer sticky:** Footer harus selalu di bawah viewport (gunakan `min-h-screen flex flex-col` + `mt-auto`).
10. **No indigo/blue colors:** Kecuali explicitly diminta, gunakan teal/emerald/violet/amber palette.
