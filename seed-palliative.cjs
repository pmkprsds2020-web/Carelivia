const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.user.findMany({
    where: { role: 'patient' },
    select: { id: true, name: true }
  });
  
  console.log('Found patients:', patients);
  
  const doctors = await prisma.user.findMany({
    where: { role: 'doctor' },
    select: { id: true, name: true }
  });
  console.log('Found doctors:', doctors);
  
  const sarah = doctors.find(d => d.name.includes('Sarah'));
  
  const existing = await prisma.palliativePatient.count();
  if (existing > 0) {
    console.log('Palliative patients already exist, count:', existing);
    return;
  }
  
  if (patients.length < 3) {
    console.log('Not enough patients found');
    return;
  }
  
  const pp1 = await prisma.palliativePatient.create({
    data: {
      id: 'pp-1',
      patientId: patients[0].id,
      rmNumber: 'RM-2025-001',
      primaryDiagnosis: 'Kanker Payudara Stadium IV',
      secondaryDiagnosis: 'Diabetes Melitus Tipe 2, Hipertensi',
      diseaseStage: 'Stadium IV',
      attendingDoctorId: sarah?.id,
      familyContactName: 'Budi Rahayu',
      familyContactRelation: 'Anak',
      familyContactPhone: '081234567890',
      careStatus: 'home_care',
      riskLevel: 'merah',
    }
  });
  
  const pp2 = await prisma.palliativePatient.create({
    data: {
      id: 'pp-2',
      patientId: patients[1].id,
      rmNumber: 'RM-2025-002',
      primaryDiagnosis: 'PPOK Stadium Berat',
      diseaseStage: 'Stadium Berat',
      attendingDoctorId: sarah?.id,
      careStatus: 'rawat_jalan',
      riskLevel: 'kuning',
    }
  });
  
  const pp3 = await prisma.palliativePatient.create({
    data: {
      id: 'pp-3',
      patientId: patients[2].id,
      rmNumber: 'RM-2025-003',
      primaryDiagnosis: 'Stroke Berat',
      secondaryDiagnosis: 'Kronis',
      diseaseStage: 'Kronis',
      attendingDoctorId: sarah?.id,
      careStatus: 'hospice',
      riskLevel: 'merah',
    }
  });
  
  console.log('Created palliative patients:', pp1.id, pp2.id, pp3.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
