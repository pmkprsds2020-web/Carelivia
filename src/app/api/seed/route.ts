import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Check if data already exists
    const userCount = await db.user.count();
    if (userCount > 0) {
      return NextResponse.json({
        message: "Database already seeded. Skipping.",
        counts: { users: userCount },
      });
    }

    const counts: Record<string, number> = {};

    // ========== USERS ==========
    const admin = await db.user.create({
      data: {
        email: "admin@carelivia.id",
        name: "Admin CareLivia",
        role: "admin",
        phone: "081111111111",
        isVerified: true,
        isActive: true,
      },
    });

    const doctors = await Promise.all([
      db.user.create({
        data: {
          email: "sarah@carelivia.id",
          name: "dr. Sarah Wijaya",
          role: "doctor",
          phone: "081222220001",
          gender: "female",
          isVerified: true,
          isActive: true,
          doctorProfile: {
            create: {
              specialization: "umum",
              licenseNumber: "STR-001",
              hospital: "RS Medika Utama",
              experience: 8,
              rating: 4.8,
              reviewCount: 124,
              consultationFee: 75000,
              isOnline: true,
              isAvailable: true,
              bio: "Dokter umum berpengalaman dengan spesialisasi penanganan penyakit ringan hingga menengah.",
              education: "Universitas Indonesia",
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "ahmad@carelivia.id",
          name: "dr. Ahmad Rizki",
          role: "doctor",
          phone: "081222220002",
          gender: "male",
          isVerified: true,
          isActive: true,
          doctorProfile: {
            create: {
              specialization: "anak",
              licenseNumber: "STR-002",
              hospital: "RS Anak Harapan",
              experience: 12,
              rating: 4.9,
              reviewCount: 203,
              consultationFee: 100000,
              isOnline: true,
              isAvailable: true,
              bio: "Spesialis anak dengan pengalaman lebih dari 10 tahun dalam menangani berbagai kasus pediatri.",
              education: "Universitas Gadjah Mada",
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "lisa@carelivia.id",
          name: "dr. Lisa Permata",
          role: "doctor",
          phone: "081222220003",
          gender: "female",
          isVerified: true,
          isActive: true,
          doctorProfile: {
            create: {
              specialization: "penyakit_dalam",
              licenseNumber: "STR-003",
              hospital: "RS Penyakit Dalam Nasional",
              experience: 15,
              rating: 4.7,
              reviewCount: 178,
              consultationFee: 125000,
              isOnline: false,
              isAvailable: true,
              bio: "Dokter spesialis penyakit dalam dengan keahlian di bidang kardiologi dan endokrinologi.",
              education: "Universitas Airlangga",
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "dewi@carelivia.id",
          name: "dr. Dewi Sartika",
          role: "doctor",
          phone: "081222220004",
          gender: "female",
          isVerified: true,
          isActive: true,
          doctorProfile: {
            create: {
              specialization: "kebidanan",
              licenseNumber: "STR-004",
              hospital: "RS Ibu dan Anak Sejahtera",
              experience: 10,
              rating: 4.9,
              reviewCount: 256,
              consultationFee: 100000,
              isOnline: true,
              isAvailable: true,
              bio: "Dokter spesialis kebidanan dan kandungan, ahli dalam perawatan kehamilan dan persalinan.",
              education: "Universitas Padjadjaran",
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "budi@carelivia.id",
          name: "drg. Budi Santoso",
          role: "doctor",
          phone: "081222220005",
          gender: "male",
          isVerified: true,
          isActive: true,
          doctorProfile: {
            create: {
              specialization: "gigi",
              licenseNumber: "STR-005",
              hospital: "Klinik Gigi Sehat Medika",
              experience: 6,
              rating: 4.6,
              reviewCount: 89,
              consultationFee: 85000,
              isOnline: true,
              isAvailable: true,
              bio: "Dokter gigi dengan keahlian perawatan gigi umum dan ortodonti dasar.",
              education: "Universitas Trisakti",
            },
          },
        },
      }),
    ]);

    const pharmacist = await db.user.create({
      data: {
        email: "farma@carelivia.id",
        name: "Apoteker Rina",
        role: "pharmacist",
        phone: "081333330001",
        gender: "female",
        isVerified: true,
        isActive: true,
        pharmacistProfile: {
          create: {
            licenseNumber: "SIPA-001",
            pharmacyName: "Apotek CareLivia",
          },
        },
      },
    });

    const homeCareStaffUser = await db.user.create({
      data: {
        email: "homecare@carelivia.id",
        name: "Perawat Andi",
        role: "homecare_staff",
        phone: "081444440001",
        gender: "male",
        isVerified: true,
        isActive: true,
        homeCareStaff: {
          create: {
            certification: "S.Kep",
            latitude: -6.2088,
            longitude: 106.8456,
            isAvailable: true,
            currentStatus: "available",
          },
        },
      },
    });

    const patients = await Promise.all([
      db.user.create({
        data: {
          email: "rina@mail.com",
          name: "Pasien Rina",
          role: "patient",
          phone: "081555550001",
          gender: "female",
          dateOfBirth: "1992-03-15",
          address: "Jl. Merdeka No. 10, Jakarta Selatan",
          nik: "3171234503920001",
          bpjsNumber: "BPJS-001234",
          isVerified: true,
          isActive: true,
          patientProfile: {
            create: {
              bloodType: "O+",
              allergies: "Penisilin",
              medicalHistory: "Asma, Demam berdarah (2019)",
              emergencyContact: "Suami - Budi",
              emergencyPhone: "081555550099",
              height: 158,
              weight: 55,
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "doni@mail.com",
          name: "Pasien Doni",
          role: "patient",
          phone: "081555550002",
          gender: "male",
          dateOfBirth: "1988-07-22",
          address: "Jl. Sudirman No. 25, Jakarta Pusat",
          nik: "3171234507880002",
          bpjsNumber: "BPJS-001235",
          isVerified: true,
          isActive: true,
          patientProfile: {
            create: {
              bloodType: "A+",
              allergies: "Tidak ada",
              medicalHistory: "Hipertensi",
              emergencyContact: "Istri - Sari",
              emergencyPhone: "081555550098",
              height: 172,
              weight: 78,
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "maya@mail.com",
          name: "Pasien Maya",
          role: "patient",
          phone: "081555550003",
          gender: "female",
          dateOfBirth: "1995-11-08",
          address: "Jl. Gatot Subroto No. 5, Jakarta Selatan",
          nik: "3171234511950003",
          isVerified: true,
          isActive: true,
          patientProfile: {
            create: {
              bloodType: "B+",
              allergies: "Kacang, Debu",
              medicalHistory: "Eksim, Rinitis alergi",
              emergencyContact: "Ibu - Titi",
              emergencyPhone: "081555550097",
              height: 162,
              weight: 52,
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "siti@mail.com",
          name: "Pasien Siti",
          role: "patient",
          phone: "081555550004",
          gender: "female",
          dateOfBirth: "1990-01-30",
          address: "Jl. Thamrin No. 15, Jakarta Pusat",
          nik: "3171234501900004",
          bpjsNumber: "BPJS-001236",
          isVerified: true,
          isActive: true,
          patientProfile: {
            create: {
              bloodType: "AB+",
              allergies: "Sulfa",
              medicalHistory: "Diabetes Tipe 2, Kehamilan (tri sem 3)",
              emergencyContact: "Suami - Hasan",
              emergencyPhone: "081555550096",
              height: 155,
              weight: 65,
            },
          },
        },
      }),
      db.user.create({
        data: {
          email: "joko@mail.com",
          name: "Pasien Joko",
          role: "patient",
          phone: "081555550005",
          gender: "male",
          dateOfBirth: "1985-05-12",
          address: "Jl. Kuningan No. 20, Jakarta Selatan",
          nik: "3171234505850005",
          bpjsNumber: "BPJS-001237",
          isVerified: true,
          isActive: true,
          patientProfile: {
            create: {
              bloodType: "O-",
              allergies: "Aspirin",
              medicalHistory: "Maag, GERD",
              emergencyContact: "Istri - Wati",
              emergencyPhone: "081555550095",
              height: 170,
              weight: 72,
            },
          },
        },
      }),
    ]);

    counts.users = 1 + doctors.length + 1 + 1 + patients.length; // admin + 5 doctors + pharmacist + homecare + 5 patients

    // ========== SCHEDULES ==========
    const doctorProfiles = await db.doctorProfile.findMany();
    const scheduleData: { doctorId: string; dayOfWeek: number; startTime: string; endTime: string }[] = [];

    for (const dp of doctorProfiles) {
      // Monday(1) to Friday(5)
      for (let day = 1; day <= 5; day++) {
        scheduleData.push({
          doctorId: dp.id,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "16:00",
        });
      }
    }

    const schedules = await db.schedule.createMany({ data: scheduleData });
    counts.schedules = scheduleData.length;

    // ========== MEDICINES ==========
    const medicinesData = [
      { name: "Paracetamol 500mg", genericName: "Paracetamol", category: "bebas", description: "Obat penurun demam dan pereda nyeri ringan hingga sedang.", price: 5000, stock: 500, unit: "tablet", manufacturer: "Kimia Farma" },
      { name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "resep", description: "Antibiotik untuk mengobati infeksi bakteri.", price: 8000, stock: 300, unit: "kapsul", manufacturer: "Kalbe Farma" },
      { name: "Omeprazole 20mg", genericName: "Omeprazole", category: "resep", description: "Obat untuk mengurangi asam lambung dan mengobati maag.", price: 12000, stock: 250, unit: "kapsul", manufacturer: "Sanbe Farma" },
      { name: "Cetirizine 10mg", genericName: "Cetirizine", category: "bebas", description: "Obat anti-alergi untuk mengatasi rhinitis dan urtikaria.", price: 6000, stock: 400, unit: "tablet", manufacturer: "Bernofarm" },
      { name: "Vitamin C 1000mg", genericName: "Asam Askorbat", category: "vitamin", description: "Suplemen vitamin C untuk meningkatkan daya tahan tubuh.", price: 15000, stock: 600, unit: "tablet", manufacturer: "Blackmores" },
      { name: "Vitamin D3 1000IU", genericName: "Kolekalsiferol", category: "vitamin", description: "Suplemen vitamin D3 untuk kesehatan tulang dan imunitas.", price: 25000, stock: 350, unit: "softgel", manufacturer: "Nature's Bounty" },
      { name: "Ibuprofen 400mg", genericName: "Ibuprofen", category: "bebas", description: "Obat anti-inflamasi non-steroid untuk nyeri dan peradangan.", price: 7000, stock: 450, unit: "tablet", manufacturer: "Fahrenheit" },
      { name: "Metformin 500mg", genericName: "Metformin HCl", category: "resep", description: "Obat untuk mengontrol gula darah pada penderita diabetes tipe 2.", price: 4000, stock: 350, unit: "tablet", manufacturer: "Indofarma" },
      { name: "Amlodipine 5mg", genericName: "Amlodipine Besylate", category: "resep", description: "Obat untuk menurunkan tekanan darah tinggi.", price: 9000, stock: 280, unit: "tablet", manufacturer: "Dexa Medica" },
      { name: "Salbutamol 2mg", genericName: "Salbutamol", category: "resep", description: "Obat untuk mengobati sesak napas dan asma.", price: 11000, stock: 200, unit: "tablet", manufacturer: "Kalbe Farma" },
      { name: "Loratadine 10mg", genericName: "Loratadine", category: "bebas", description: "Obat anti-histamin untuk alergi tanpa menyebabkan ngantuk.", price: 8500, stock: 380, unit: "tablet", manufacturer: "Tempo Scan" },
      { name: "Antacid", genericName: "Aluminium Hydroxide + Magnesium Hydroxide", category: "bebas", description: "Obat untuk menetralkan asam lambung dan meredakan maag.", price: 3500, stock: 500, unit: "tablet", manufacturer: "Kimia Farma" },
      { name: "Termometer Digital", genericName: null, category: "alat_kesehatan", description: "Termometer digital untuk mengukur suhu tubuh dengan akurat.", price: 75000, stock: 100, unit: "buah", manufacturer: "Omron" },
      { name: "Tensimeter", genericName: null, category: "alat_kesehatan", description: "Alat pengukur tekanan darah digital untuk pemantauan di rumah.", price: 250000, stock: 50, unit: "buah", manufacturer: "Omron" },
      { name: "Masker Medis 50pcs", genericName: null, category: "alat_kesehatan", description: "Masker medis 3 lapis untuk perlindungan kesehatan.", price: 35000, stock: 200, unit: "box", manufacturer: "Medikon" },
    ];

    for (const med of medicinesData) {
      await db.medicine.create({ data: med });
    }
    counts.medicines = medicinesData.length;

    // ========== HOME CARE SERVICES ==========
    const homeCareServicesData = [
      { name: "Perawatan Luka", description: "Perawatan luka oleh perawat profesional di rumah Anda, termasuk pembersihan dan penggantian balutan.", category: "perawatan_luka", price: 150000, duration: 45 },
      { name: "Pemasangan Infus", description: "Pemasangan infus oleh perawat terlatih di rumah sesuai resep dokter.", category: "infus", price: 200000, duration: 30 },
      { name: "Injeksi/Injeksi IM", description: "Penyuntikan obat intra-muskular oleh perawat profesional di rumah.", category: "injeksi", price: 100000, duration: 20 },
      { name: "Pemeriksaan Lansia", description: "Pemeriksaan kesehatan menyeluruh untuk lansia di rumah, termasuk cek tekanan darah, gula darah, dan kondisi umum.", category: "pemeriksaan_lansia", price: 175000, duration: 60 },
      { name: "Kunjungan Dokter", description: "Kunjungan dokter ke rumah untuk konsultasi dan pemeriksaan langsung.", category: "kunjungan_dokter", price: 350000, duration: 45 },
      { name: "Kunjungan Bidan", description: "Kunjungan bidan untuk perawatan kehamilan, pasca melahirkan, dan konsultasi kesehatan reproduksi.", category: "kunjungan_bidan", price: 250000, duration: 45 },
      { name: "Pengambilan Sampel Lab", description: "Pengambilan sampel darah/urine di rumah untuk pemeriksaan laboratorium.", category: "lab_sample", price: 125000, duration: 30 },
      { name: "Fisioterapi", description: "Layanan fisioterapi di rumah untuk pemulihan cedera dan rehabilitasi.", category: "fisioterapi", price: 300000, duration: 60 },
    ];

    const homeCareServices: any[] = [];
    for (const svc of homeCareServicesData) {
      homeCareServices.push(await db.homeCareService.create({ data: svc }));
    }
    counts.homeCareServices = homeCareServicesData.length;

    // ========== ARTICLES ==========
    const articlesData = [
      {
        title: "5 Tips Menjaga Kesehatan Jantung",
        content: "Penyakit jantung merupakan salah satu penyebab kematian tertinggi di Indonesia. Berikut 5 tips yang bisa Anda lakukan untuk menjaga kesehatan jantung:\n\n1. Konsumsi makanan sehat dengan gizi seimbang\n2. Rutin berolahraga minimal 30 menit per hari\n3. Hindari merokok dan konsumsi alkohol\n4. Kelola stres dengan baik\n5. Lakukan pemeriksaan kesehatan secara berkala\n\nDengan menerapkan pola hidup sehat, risiko penyakit jantung dapat diturunkan secara signifikan. Jangan lupa untuk berkonsultasi dengan dokter secara rutin.",
        category: "kesehatan_jantung",
        author: "dr. Lisa Permata",
        isPublished: true,
      },
      {
        title: "Pentingnya Vaksinasi untuk Anak",
        content: "Vaksinasi adalah salah satu langkah pencegahan penyakit yang paling efektif untuk anak. Vaksin membantu sistem kekebalan tubuh anak untuk melawan berbagai penyakit berbahaya.\n\nJadwal vaksinasi yang perlu diperhatikan:\n- BCG: Usia 1 bulan\n- DPT: Usia 2, 4, 6 bulan\n- Polio: Usia 1, 2, 3, 4 bulan\n- Campak: Usia 9 bulan\n\nPastikan anak Anda mendapatkan vaksinasi lengkap sesuai jadwal. Konsultasikan dengan dokter anak untuk informasi lebih lanjut.",
        category: "vaksinasi",
        author: "dr. Ahmad Rizki",
        isPublished: true,
      },
      {
        title: "Cara Mengelola Diabetes dengan Baik",
        content: "Diabetes merupakan penyakit kronis yang memerlukan pengelolaan jangka panjang. Berikut cara-cara untuk mengelola diabetes dengan baik:\n\n1. Pantau gula darah secara rutin\n2. Jaga pola makan dengan memperhatikan asupan karbohidrat\n3. Olahraga teratur sesuai kemampuan\n4. Minum obat secara teratur sesuai anjuran dokter\n5. Kelola stres dengan baik\n6. Lakukan pemeriksaan rutin ke dokter\n\nDengan pengelolaan yang tepat, penderita diabetes tetap bisa menjalani kehidupan yang berkualitas.",
        category: "diabetes",
        author: "dr. Sarah Wijaya",
        isPublished: true,
      },
      {
        title: "Manfaat Olahraga Pagi untuk Kesehatan Mental",
        content: "Olahraga pagi tidak hanya bermanfaat untuk kesehatan fisik, tetapi juga memberikan dampak positif pada kesehatan mental.\n\nManfaat olahraga pagi untuk kesehatan mental:\n- Mengurangi stres dan kecemasan\n- Meningkatkan mood melalui pelepasan endorfin\n- Meningkatkan kualitas tidur\n- Meningkatkan konsentrasi dan fokus\n- Membangun kebiasaan positif\n\nCukup 30 menit olahraga ringan seperti jalan kaki, yoga, atau stretching setiap pagi bisa memberikan manfaat yang signifikan.",
        category: "kesehatan_mental",
        author: "dr. Sarah Wijaya",
        isPublished: true,
      },
      {
        title: "Panduan Nutrisi Seimbang untuk Keluarga",
        content: "Nutrisi seimbang adalah kunci kesehatan seluruh anggota keluarga. Berikut panduan sederhana yang bisa diterapkan:\n\nPrinsip Isi Piringku:\n- 1/2 piring sayuran dan buah-buahan\n- 1/4 piring karbohidrat (nasi, kentang, dll)\n- 1/4 piring protein (ikan, ayam, tempe, tahu)\n\nTips praktis:\n1. Variasikan menu setiap hari\n2. Batasi gula, garam, dan lemak\n3. Minum air putih 8 gelas per hari\n4. Konsumsi buah dan sayur 5 porsi per hari\n5. Biasakan sarapan sebelum beraktivitas\n\nDengan menerapkan nutrisi seimbang, keluarga akan lebih sehat dan produktif.",
        category: "nutrisi",
        author: "dr. Ahmad Rizki",
        isPublished: true,
      },
    ];

    for (const article of articlesData) {
      await db.article.create({ data: article });
    }
    counts.articles = articlesData.length;

    // ========== CONSULTATIONS ==========
    const drSarah = doctors[0];
    const drAhmad = doctors[1];
    const drLisa = doctors[2];
    const drDewi = doctors[3];

    const drSarahProfile = (await db.doctorProfile.findFirst({ where: { userId: drSarah.id } }))!;
    const drAhmadProfile = (await db.doctorProfile.findFirst({ where: { userId: drAhmad.id } }))!;
    const drLisaProfile = (await db.doctorProfile.findFirst({ where: { userId: drLisa.id } }))!;
    const drDewiProfile = (await db.doctorProfile.findFirst({ where: { userId: drDewi.id } }))!;

    const consultationData = [
      { patientId: patients[0].id, doctorId: drSarahProfile.id, type: "chat", status: "completed", startTime: new Date("2025-02-20T09:00:00"), endTime: new Date("2025-02-20T09:30:00"), notes: "Konsultasi demam dan flu", rating: 5, review: "Dokter sangat membantu dan responsif" },
      { patientId: patients[1].id, doctorId: drLisaProfile.id, type: "video", status: "completed", startTime: new Date("2025-02-21T10:00:00"), endTime: new Date("2025-02-21T10:45:00"), notes: "Konsultasi hipertensi", rating: 4, review: "Penjelasan sangat jelas" },
      { patientId: patients[2].id, doctorId: drAhmadProfile.id, type: "chat", status: "completed", startTime: new Date("2025-02-22T14:00:00"), endTime: new Date("2025-02-22T14:30:00"), notes: "Konsultasi alergi", rating: 5, review: "Respon cepat dan tepat" },
      { patientId: patients[3].id, doctorId: drDewiProfile.id, type: "video", status: "completed", startTime: new Date("2025-02-23T11:00:00"), endTime: new Date("2025-02-23T11:45:00"), notes: "Kontrol kehamilan trimester 3", rating: 5, review: "Dokter sangat ramah dan detail" },
      { patientId: patients[4].id, doctorId: drSarahProfile.id, type: "chat", status: "active", startTime: new Date("2025-02-25T08:30:00"), notes: "Konsultasi maag" },
      { patientId: patients[0].id, doctorId: drAhmadProfile.id, type: "chat", status: "waiting", notes: "Konsultasi batuk pilek anak" },
      { patientId: patients[2].id, doctorId: drSarahProfile.id, type: "audio", status: "completed", startTime: new Date("2025-02-19T16:00:00"), endTime: new Date("2025-02-19T16:20:00"), notes: "Konsultasi sakit kepala", rating: 4 },
      { patientId: patients[1].id, doctorId: drLisaProfile.id, type: "video", status: "cancelled", notes: "Konsultasi kontrol gula darah" },
      { patientId: patients[3].id, doctorId: drSarahProfile.id, type: "chat", status: "completed", startTime: new Date("2025-02-18T13:00:00"), endTime: new Date("2025-02-18T13:25:00"), notes: "Konsultasi demam", rating: 5, review: "Sangat membantu" },
      { patientId: patients[4].id, doctorId: drLisaProfile.id, type: "chat", status: "completed", startTime: new Date("2025-02-17T09:00:00"), endTime: new Date("2025-02-17T09:35:00"), notes: "Konsultasi GERD", rating: 4, review: "Saran sangat bermanfaat" },
    ];

    const consultations: any[] = [];
    for (const c of consultationData) {
      consultations.push(await db.consultation.create({ data: c }));
    }
    counts.consultations = consultationData.length;

    // ========== MESSAGES ==========
    const messagesData = [
      { consultationId: consultations[0].id, senderId: patients[0].id, content: "Selamat pagi dok, saya sudah 2 hari demam dan pilek.", type: "text" },
      { consultationId: consultations[0].id, senderId: drSarah.id, content: "Selamat pagi. Demamnya sampai berapa derajat? Apakah ada batuk juga?", type: "text" },
      { consultationId: consultations[0].id, senderId: patients[0].id, content: "Demamnya 38.5 derajat dok, ada batuk ringan.", type: "text" },
      { consultationId: consultations[0].id, senderId: drSarah.id, content: "Baik, saya akan memberikan resep obat. Minum paracetamol untuk demam dan banyak minum air putih.", type: "text" },
      { consultationId: consultations[1].id, senderId: patients[1].id, content: "Dok, tekanan darah saya kemarin 150/90. Apakah perlu khawatir?", type: "text" },
      { consultationId: consultations[1].id, senderId: drLisa.id, content: "Tekanan darah 150/90 termasuk hipertensi derajat 1. Apakah Anda rutin minum obat?", type: "text" },
      { consultationId: consultations[1].id, senderId: patients[1].id, content: "Sering lupa dok minum obatnya.", type: "text" },
      { consultationId: consultations[1].id, senderId: drLisa.id, content: "Penting untuk minum obat teratur. Saya akan buatkan resep amlodipine. Jaga pola makan rendah garam.", type: "text" },
      { consultationId: consultations[4].id, senderId: patients[4].id, content: "Dok, perut saya sering sakut terutama malam hari.", type: "text" },
      { consultationId: consultations[4].id, senderId: drSarah.id, content: "Apakah ada heartburn atau mulas? Sudah berapa lama?", type: "text" },
    ];

    for (const msg of messagesData) {
      await db.message.create({ data: msg });
    }
    counts.messages = messagesData.length;

    // ========== PRESCRIPTIONS ==========
    const prescriptionData = [
      {
        consultationId: consultations[0].id,
        doctorId: drSarahProfile.id,
        patientId: patients[0].id,
        status: "active",
        notes: "Minum obat teratur dan banyak istirahat.",
        items: {
          create: [
            { medicineName: "Paracetamol 500mg", dosage: "500mg", quantity: 10, frequency: "3x sehari", duration: "3 hari", instructions: "Diminum setelah makan" },
            { medicineName: "Cetirizine 10mg", dosage: "10mg", quantity: 7, frequency: "1x sehari", duration: "7 hari", instructions: "Diminum sebelum tidur" },
          ],
        },
      },
      {
        consultationId: consultations[1].id,
        doctorId: drLisaProfile.id,
        patientId: patients[1].id,
        status: "active",
        notes: "Kontrol tekanan darah secara rutin.",
        items: {
          create: [
            { medicineName: "Amlodipine 5mg", dosage: "5mg", quantity: 30, frequency: "1x sehari", duration: "30 hari", instructions: "Diminum pada pagi hari" },
          ],
        },
      },
      {
        consultationId: consultations[2].id,
        doctorId: drAhmadProfile.id,
        patientId: patients[2].id,
        status: "fulfilled",
        notes: "Hindari alergen dan jaga kebersihan lingkungan.",
        items: {
          create: [
            { medicineName: "Loratadine 10mg", dosage: "10mg", quantity: 14, frequency: "1x sehari", duration: "14 hari", instructions: "Bisa diminum pagi atau malam" },
            { medicineName: "Cetirizine 10mg", dosage: "10mg", quantity: 7, frequency: "1x sehari", duration: "7 hari", instructions: "Diminum saat gejala kambuh" },
          ],
        },
      },
      {
        consultationId: consultations[3].id,
        doctorId: drDewiProfile.id,
        patientId: patients[3].id,
        status: "active",
        notes: "Kontrol rutin setiap 2 minggu.",
        items: {
          create: [
            { medicineName: "Vitamin D3 1000IU", dosage: "1000IU", quantity: 30, frequency: "1x sehari", duration: "30 hari", instructions: "Diminum setelah makan" },
            { medicineName: "Vitamin C 1000mg", dosage: "1000mg", quantity: 30, frequency: "1x sehari", duration: "30 hari", instructions: "Diminum setelah makan siang" },
          ],
        },
      },
    ];

    for (const rx of prescriptionData) {
      await db.prescription.create({ data: rx });
    }
    counts.prescriptions = prescriptionData.length;

    // ========== ORDERS ==========
    const allMedicines = await db.medicine.findMany();
    const orderData = [
      {
        userId: patients[0].id,
        status: "delivered",
        totalAmount: 22000,
        shippingFee: 10000,
        shippingAddress: "Jl. Merdeka No. 10, Jakarta Selatan",
        trackingNumber: "JNE-123456789",
        items: {
          create: [
            { medicineId: allMedicines[0].id, quantity: 2, price: 5000 },
            { medicineId: allMedicines[3].id, quantity: 2, price: 6000 },
          ],
        },
      },
      {
        userId: patients[1].id,
        status: "shipped",
        totalAmount: 260000,
        shippingFee: 15000,
        shippingAddress: "Jl. Sudirman No. 25, Jakarta Pusat",
        trackingNumber: "TIKI-987654321",
        items: {
          create: [
            { medicineId: allMedicines[8].id, quantity: 3, price: 9000 },
            { medicineId: allMedicines[13].id, quantity: 1, price: 250000 },
          ],
        },
      },
      {
        userId: patients[2].id,
        status: "processing",
        totalAmount: 67000,
        shippingFee: 10000,
        shippingAddress: "Jl. Gatot Subroto No. 5, Jakarta Selatan",
        items: {
          create: [
            { medicineId: allMedicines[10].id, quantity: 2, price: 8500 },
            { medicineId: allMedicines[4].id, quantity: 2, price: 15000 },
            { medicineId: allMedicines[14].id, quantity: 1, price: 35000 },
          ],
        },
      },
      {
        userId: patients[3].id,
        status: "pending",
        totalAmount: 65000,
        shippingFee: 10000,
        shippingAddress: "Jl. Thamrin No. 15, Jakarta Pusat",
        items: {
          create: [
            { medicineId: allMedicines[5].id, quantity: 1, price: 25000 },
            { medicineId: allMedicines[4].id, quantity: 2, price: 15000 },
          ],
        },
      },
      {
        userId: patients[4].id,
        status: "confirmed",
        totalAmount: 39000,
        shippingFee: 10000,
        shippingAddress: "Jl. Kuningan No. 20, Jakarta Selatan",
        items: {
          create: [
            { medicineId: allMedicines[11].id, quantity: 2, price: 3500 },
            { medicineId: allMedicines[2].id, quantity: 2, price: 12000 },
          ],
        },
      },
    ];

    for (const order of orderData) {
      await db.order.create({ data: order });
    }
    counts.orders = orderData.length;

    // ========== PAYMENTS ==========
    const paymentData = [
      { userId: patients[0].id, amount: 75000, method: "qris", status: "success", type: "consultation", referenceId: consultations[0].id, invoiceNumber: "INV-2025-001", paidAt: new Date("2025-02-20T09:00:00") },
      { userId: patients[1].id, amount: 125000, method: "bank_transfer", status: "success", type: "consultation", referenceId: consultations[1].id, invoiceNumber: "INV-2025-002", paidAt: new Date("2025-02-21T10:00:00") },
      { userId: patients[2].id, amount: 100000, method: "gopay", status: "success", type: "consultation", referenceId: consultations[2].id, invoiceNumber: "INV-2025-003", paidAt: new Date("2025-02-22T14:00:00") },
      { userId: patients[3].id, amount: 100000, method: "ovo", status: "success", type: "consultation", referenceId: consultations[3].id, invoiceNumber: "INV-2025-004", paidAt: new Date("2025-02-23T11:00:00") },
      { userId: patients[0].id, amount: 22000, method: "qris", status: "success", type: "pharmacy", invoiceNumber: "INV-2025-005", paidAt: new Date("2025-02-24T10:00:00") },
      { userId: patients[1].id, amount: 260000, method: "va", status: "pending", type: "pharmacy", invoiceNumber: "INV-2025-006" },
      { userId: patients[2].id, amount: 67000, method: "dana", status: "success", type: "pharmacy", invoiceNumber: "INV-2025-007", paidAt: new Date("2025-02-24T12:00:00") },
      { userId: patients[3].id, amount: 65000, method: "shopeepay", status: "pending", type: "pharmacy", invoiceNumber: "INV-2025-008" },
      { userId: patients[0].id, amount: 150000, method: "qris", status: "success", type: "homecare", invoiceNumber: "INV-2025-009", paidAt: new Date("2025-02-24T08:00:00") },
      { userId: patients[1].id, amount: 175000, method: "bank_transfer", status: "success", type: "homecare", invoiceNumber: "INV-2025-010", paidAt: new Date("2025-02-24T09:00:00") },
    ];

    for (const pay of paymentData) {
      await db.payment.create({ data: pay });
    }
    counts.payments = paymentData.length;

    // ========== HOME CARE BOOKINGS ==========
    const hcStaff = (await db.homeCareStaff.findFirst())!;
    const homeCareBookingsData = [
      { patientId: patients[0].id, staffId: hcStaff.id, serviceId: homeCareServices[0].id, status: "completed", scheduledAt: new Date("2025-02-24T09:00:00"), completedAt: new Date("2025-02-24T09:45:00"), address: "Jl. Merdeka No. 10, Jakarta Selatan", latitude: -6.2615, longitude: 106.8106, notes: "Luka di kaki kiri akibat terjatuh" },
      { patientId: patients[1].id, staffId: hcStaff.id, serviceId: homeCareServices[3].id, status: "in_progress", scheduledAt: new Date("2025-02-25T10:00:00"), address: "Jl. Sudirman No. 25, Jakarta Pusat", latitude: -6.2088, longitude: 106.8456, notes: "Pemeriksaan rutin untuk ayah (75 tahun)" },
      { patientId: patients[3].id, staffId: hcStaff.id, serviceId: homeCareServices[5].id, status: "confirmed", scheduledAt: new Date("2025-02-26T14:00:00"), address: "Jl. Thamrin No. 15, Jakarta Pusat", latitude: -6.1861, longitude: 106.8348, notes: "Kontrol kehamilan di rumah" },
      { patientId: patients[4].id, serviceId: homeCareServices[6].id, status: "pending", scheduledAt: new Date("2025-02-27T08:00:00"), address: "Jl. Kuningan No. 20, Jakarta Selatan", latitude: -6.2349, longitude: 106.8306, notes: "Cek darah rutin" },
      { patientId: patients[2].id, serviceId: homeCareServices[7].id, status: "pending", scheduledAt: new Date("2025-02-28T09:00:00"), address: "Jl. Gatot Subroto No. 5, Jakarta Selatan", latitude: -6.2435, longitude: 106.8116, notes: "Fisioterapi lutut setelah operasi" },
    ];

    for (const hb of homeCareBookingsData) {
      await db.homeCareBooking.create({ data: hb });
    }
    counts.homeCareBookings = homeCareBookingsData.length;

    // ========== MEDICAL RECORDS ==========
    const medicalRecordsData = [
      { patientId: patients[0].id, consultationId: consultations[0].id, diagnosis: "Influenza", symptoms: "Demam, pilek, batuk ringan", treatment: "Paracetamol 500mg 3x1, Cetirizine 10mg 1x1, istirahat cukup", notes: "Kondisi membaik setelah 3 hari pengobatan" },
      { patientId: patients[1].id, consultationId: consultations[1].id, diagnosis: "Hipertensi Derajat 1", symptoms: "Sakit kepala, tekanan darah 150/90 mmHg", treatment: "Amlodipine 5mg 1x1, diet rendah garam", notes: "Perlu kontrol rutin setiap bulan" },
      { patientId: patients[2].id, consultationId: consultations[2].id, diagnosis: "Rinitis Alergika", symptoms: "Hidung tersumbat, bersin, gatal pada mata", treatment: "Loratadine 10mg 1x1, hindari alergen", labResults: "IgE total: 350 IU/mL (meningkat)" },
      { patientId: patients[3].id, consultationId: consultations[3].id, diagnosis: "Kehamilan Trimester 3 Normal", symptoms: "Kontrol rutin kehamilan", treatment: "Vitamin D3 dan Vitamin C, kontrol 2 minggu", notes: "Kehamilan berjalan normal, taksiran lahir April 2025" },
      { patientId: patients[4].id, consultationId: consultations[9].id, diagnosis: "GERD", symptoms: "Heartburn, mulas terutama malam hari", treatment: "Omeprazole 20mg 1x1, Antacid 3x1 saat perlu", notes: "Hindari makan pedas dan berlemak, jangan berbaring setelah makan" },
      { patientId: patients[0].id, consultationId: consultations[6].id, diagnosis: "Tension Headache", symptoms: "Sakit kepala tegang, terasa seperti diikat", treatment: "Ibuprofen 400mg saat perlu, manajemen stres", notes: "Stres kerja sebagai pencetus, perlu teknik relaksasi" },
    ];

    for (const mr of medicalRecordsData) {
      await db.medicalRecord.create({ data: mr });
    }
    counts.medicalRecords = medicalRecordsData.length;

    // ========== NOTIFICATIONS ==========
    const notificationsData = [
      { userId: patients[0].id, title: "Konsultasi Selesai", message: "Konsultasi Anda dengan dr. Sarah Wijaya telah selesai. Jangan lupa beri rating!", type: "consultation", referenceId: consultations[0].id },
      { userId: patients[0].id, title: "Pesanan Dikirim", message: "Pesanan obat Anda sedang dalam pengiriman. No. resi: JNE-123456789", type: "pharmacy" },
      { userId: patients[1].id, title: "Pembayaran Berhasil", message: "Pembayaran konsultasi Rp 125.000 telah berhasil.", type: "payment" },
      { userId: patients[1].id, title: "Home Care Dalam Proses", message: "Perawat Andi sedang menuju lokasi Anda untuk pemeriksaan lansia.", type: "homecare" },
      { userId: patients[2].id, title: "Resep Obat Aktif", message: "Resep obat dari dr. Ahmad Rizki sudah aktif. Pesan sekarang di apotek!", type: "pharmacy" },
      { userId: patients[2].id, title: "Konsultasi Menunggu", message: "Anda memiliki jadwal konsultasi yang menunggu konfirmasi dokter.", type: "consultation" },
      { userId: patients[3].id, title: "Home Care Dikonfirmasi", message: "Kunjungan bidan Anda pada 26 Februari telah dikonfirmasi.", type: "homecare" },
      { userId: patients[3].id, title: "Pembayaran Pending", message: "Pembayaran pesanan apotek Rp 65.000 menunggu pembayaran.", type: "payment" },
      { userId: patients[4].id, title: "Konsultasi Aktif", message: "Konsultasi Anda dengan dr. Sarah Wijaya sedang berlangsung.", type: "chat" },
      { userId: patients[4].id, title: "Home Care Terjadwal", message: "Pengambilan sampel lab dijadwalkan pada 27 Februari pukul 08:00.", type: "homecare" },
      { userId: drSarah.id, title: "Konsultasi Baru", message: "Anda memiliki permintaan konsultasi baru dari Pasien Joko.", type: "consultation" },
      { userId: drSarah.id, title: "Pendapatan Baru", message: "Anda menerima pendapatan Rp 75.000 dari konsultasi.", type: "payment" },
      { userId: drLisa.id, title: "Rating Baru", message: "Pasien Doni memberikan rating 4 bintang untuk konsultasi Anda.", type: "consultation" },
      { userId: admin.id, title: "Laporan Harian", message: "Laporan harian: 5 konsultasi, 3 pesanan apotek, 2 home care hari ini.", type: "reminder" },
    ];

    for (const notif of notificationsData) {
      await db.notification.create({ data: notif });
    }
    counts.notifications = notificationsData.length;

    // ========== DOCTOR EARNINGS ==========
    const earningsData = [
      { doctorId: drSarahProfile.id, consultationId: consultations[0].id, amount: 75000, status: "paid" },
      { doctorId: drLisaProfile.id, consultationId: consultations[1].id, amount: 125000, status: "paid" },
      { doctorId: drAhmadProfile.id, consultationId: consultations[2].id, amount: 100000, status: "paid" },
      { doctorId: drDewiProfile.id, consultationId: consultations[3].id, amount: 100000, status: "pending" },
      { doctorId: drSarahProfile.id, consultationId: consultations[8].id, amount: 75000, status: "paid" },
      { doctorId: drLisaProfile.id, consultationId: consultations[9].id, amount: 125000, status: "pending" },
    ];

    for (const earning of earningsData) {
      await db.doctorEarning.create({ data: earning });
    }
    counts.doctorEarnings = earningsData.length;

    return NextResponse.json({
      message: "Database seeded successfully!",
      counts,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
