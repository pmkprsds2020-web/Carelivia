import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/palliative-monitoring
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'patients') {
      const patients = await db.palliativePatient.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 1 },
          medications: { where: { isActive: true } },
          acpDocuments: { where: { isActive: true } },
          screeningRecords: { orderBy: { performedAt: 'desc' }, take: 5 },
        },
      });

      // Enrich with patient user data
      const enrichedPatients = await Promise.all(
        patients.map(async (p) => {
          const user = await db.user.findUnique({ where: { id: p.patientId } });
          return {
            ...p,
            patientName: user?.name || 'Unknown',
            dateOfBirth: user?.dateOfBirth || undefined,
            gender: user?.gender || undefined,
            attendingDoctorName: p.attendingDoctorId
              ? (await db.doctorProfile.findUnique({
                  where: { userId: p.attendingDoctorId },
                  include: { user: true },
                }))?.user?.name || undefined
              : undefined,
          };
        })
      );

      return NextResponse.json({ patients: enrichedPatients });
    }

    if (type === 'vitals') {
      const patientId = searchParams.get('patientId');
      const where = patientId ? { palliativePatientId: patientId } : {};
      const records = await db.vitalSignRecord.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        take: 100,
      });
      return NextResponse.json({ vitals: records });
    }

    if (type === 'medications') {
      const patientId = searchParams.get('patientId');
      const where = patientId ? { palliativePatientId: patientId } : {};
      const meds = await db.palliativeMedication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { adherences: { orderBy: { date: 'desc' }, take: 30 } },
      });
      return NextResponse.json({ medications: meds });
    }

    if (type === 'acp') {
      const patientId = searchParams.get('patientId');
      const where = patientId ? { palliativePatientId: patientId } : {};
      const plans = await db.advanceCarePlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { revisions: { orderBy: { createdAt: 'desc' } } },
      });
      return NextResponse.json({ acp: plans });
    }

    if (type === 'screenings') {
      const patientId = searchParams.get('patientId');
      const where = patientId ? { palliativePatientId: patientId } : {};
      const records = await db.palliativeScreeningRecord.findMany({
        where,
        orderBy: { performedAt: 'desc' },
      });
      return NextResponse.json({ screenings: records });
    }

    // Default: return all patients summary
    const patients = await db.palliativePatient.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Palliative monitoring GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST /api/palliative-monitoring
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'add-patient') {
      const patient = await db.palliativePatient.create({
        data: {
          patientId: body.patientId,
          rmNumber: body.rmNumber || null,
          bpjsNumber: body.bpjsNumber || null,
          nik: body.nik || null,
          primaryDiagnosis: body.primaryDiagnosis || null,
          secondaryDiagnosis: body.secondaryDiagnosis || null,
          diseaseStage: body.diseaseStage || null,
          attendingDoctorId: body.attendingDoctorId || null,
          familyContactName: body.familyContactName || null,
          familyContactRelation: body.familyContactRelation || null,
          familyContactPhone: body.familyContactPhone || null,
          address: body.address || null,
          careStatus: body.careStatus || 'rawat_jalan',
          patientStatus: body.patientStatus || 'aktif',
          riskLevel: body.riskLevel || 'hijau',
          notes: body.notes || null,
        },
      });
      return NextResponse.json({ patient });
    }

    if (action === 'add-vital') {
      const height = body.height ? Number(body.height) : null;
      const weight = body.weight ? Number(body.weight) : null;
      let bmi: number | null = null;
      if (height && weight && height > 0) {
        const heightM = height / 100;
        bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
      }

      const record = await db.vitalSignRecord.create({
        data: {
          palliativePatientId: body.palliativePatientId,
          recordedBy: body.recordedBy || null,
          systolicBP: body.systolicBP ? Number(body.systolicBP) : null,
          diastolicBP: body.diastolicBP ? Number(body.diastolicBP) : null,
          heartRate: body.heartRate ? Number(body.heartRate) : null,
          respiratoryRate: body.respiratoryRate ? Number(body.respiratoryRate) : null,
          temperature: body.temperature ? Number(body.temperature) : null,
          oxygenSat: body.oxygenSat ? Number(body.oxygenSat) : null,
          weight,
          height,
          bmi,
          notes: body.notes || null,
        },
      });

      // Update risk level based on vital signs
      await updatePatientRiskLevel(body.palliativePatientId);

      return NextResponse.json({ vital: record });
    }

    if (action === 'add-medication') {
      const med = await db.palliativeMedication.create({
        data: {
          palliativePatientId: body.palliativePatientId,
          medicineName: body.medicineName,
          dosage: body.dosage,
          frequency: body.frequency,
          route: body.route || null,
          startDate: body.startDate || null,
          endDate: body.endDate || null,
          indication: body.indication || null,
          isActive: true,
          notes: body.notes || null,
        },
      });
      return NextResponse.json({ medication: med });
    }

    if (action === 'add-adherence') {
      const adherence = await db.medicationAdherence.create({
        data: {
          medicationId: body.medicationId,
          palliativePatientId: body.palliativePatientId,
          date: body.date,
          takenOnTime: body.takenOnTime ?? true,
          missedDose: body.missedDose ?? false,
          sideEffects: body.sideEffects || null,
          complaints: body.complaints || null,
        },
      });
      return NextResponse.json({ adherence });
    }

    if (action === 'add-acp') {
      const plan = await db.advanceCarePlan.create({
        data: {
          palliativePatientId: body.palliativePatientId,
          decisionMakerName: body.decisionMakerName || null,
          decisionMakerRelation: body.decisionMakerRelation || null,
          decisionMakerPhone: body.decisionMakerPhone || null,
          preferredCareLocation: body.preferredCareLocation || null,
          careGoal: body.careGoal || null,
          resuscitationPref: body.resuscitationPref || null,
          ventilatorPref: body.ventilatorPref || null,
          icuPref: body.icuPref || null,
          artificialNutrition: body.artificialNutrition || null,
          dialysisPref: body.dialysisPref || null,
          organDonation: body.organDonation || null,
          patientHopes: body.patientHopes || null,
          patientWorries: body.patientWorries || null,
          lifeValues: body.lifeValues || null,
          endOfLifePrefs: body.endOfLifePrefs || null,
          patientSigned: body.patientSigned ?? false,
          familySigned: body.familySigned ?? false,
          doctorSigned: body.doctorSigned ?? false,
          signedAt: body.signedAt || null,
          isActive: true,
        },
      });
      return NextResponse.json({ acp: plan });
    }

    if (action === 'add-screening-record') {
      const record = await db.palliativeScreeningRecord.create({
        data: {
          palliativePatientId: body.palliativePatientId,
          screeningType: body.screeningType,
          score: body.score || null,
          scoreLabel: body.scoreLabel || null,
          interpretation: body.interpretation || null,
          ewsLevel: body.ewsLevel || null,
          details: body.details || null,
        },
      });
      return NextResponse.json({ screening: record });
    }

    if (action === 'update-patient') {
      const patient = await db.palliativePatient.update({
        where: { id: body.id },
        data: {
          ...(body.rmNumber !== undefined && { rmNumber: body.rmNumber }),
          ...(body.bpjsNumber !== undefined && { bpjsNumber: body.bpjsNumber }),
          ...(body.nik !== undefined && { nik: body.nik }),
          ...(body.primaryDiagnosis !== undefined && { primaryDiagnosis: body.primaryDiagnosis }),
          ...(body.secondaryDiagnosis !== undefined && { secondaryDiagnosis: body.secondaryDiagnosis }),
          ...(body.diseaseStage !== undefined && { diseaseStage: body.diseaseStage }),
          ...(body.attendingDoctorId !== undefined && { attendingDoctorId: body.attendingDoctorId }),
          ...(body.familyContactName !== undefined && { familyContactName: body.familyContactName }),
          ...(body.familyContactRelation !== undefined && { familyContactRelation: body.familyContactRelation }),
          ...(body.familyContactPhone !== undefined && { familyContactPhone: body.familyContactPhone }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.careStatus !== undefined && { careStatus: body.careStatus }),
          ...(body.patientStatus !== undefined && { patientStatus: body.patientStatus }),
          ...(body.riskLevel !== undefined && { riskLevel: body.riskLevel }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
      });
      return NextResponse.json({ patient });
    }

    if (action === 'update-medication') {
      const med = await db.palliativeMedication.update({
        where: { id: body.id },
        data: {
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.dosage !== undefined && { dosage: body.dosage }),
          ...(body.frequency !== undefined && { frequency: body.frequency }),
          ...(body.route !== undefined && { route: body.route }),
          ...(body.endDate !== undefined && { endDate: body.endDate }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
      });
      return NextResponse.json({ medication: med });
    }

    if (action === 'update-acp') {
      const plan = await db.advanceCarePlan.update({
        where: { id: body.id },
        data: {
          ...(body.patientSigned !== undefined && { patientSigned: body.patientSigned }),
          ...(body.familySigned !== undefined && { familySigned: body.familySigned }),
          ...(body.doctorSigned !== undefined && { doctorSigned: body.doctorSigned }),
          ...(body.signedAt !== undefined && { signedAt: body.signedAt }),
        },
      });

      // Create revision record if changes were made
      if (body.changes) {
        await db.aCPRevision.create({
          data: {
            acpId: body.id,
            revisedBy: body.revisedBy || null,
            changes: JSON.stringify(body.changes),
            reason: body.reason || null,
          },
        });
      }

      return NextResponse.json({ acp: plan });
    }

    if (action === 'delete-patient') {
      await db.palliativePatient.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Palliative monitoring POST error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// Helper: Update patient risk level based on latest vitals
async function updatePatientRiskLevel(palliativePatientId: string) {
  try {
    const latestVital = await db.vitalSignRecord.findFirst({
      where: { palliativePatientId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!latestVital) return;

    let riskLevel = 'hijau';

    // Check critical values
    if (
      (latestVital.oxygenSat !== null && latestVital.oxygenSat < 90) ||
      (latestVital.respiratoryRate !== null && latestVital.respiratoryRate > 24) ||
      (latestVital.temperature !== null && latestVital.temperature > 38) ||
      (latestVital.systolicBP !== null && latestVital.systolicBP < 90)
    ) {
      riskLevel = 'merah';
    } else if (
      (latestVital.oxygenSat !== null && latestVital.oxygenSat >= 90 && latestVital.oxygenSat < 95) ||
      (latestVital.respiratoryRate !== null && latestVital.respiratoryRate > 20 && latestVital.respiratoryRate <= 24) ||
      (latestVital.heartRate !== null && (latestVital.heartRate > 100 || latestVital.heartRate < 60))
    ) {
      riskLevel = 'kuning';
    }

    // Also check screening records
    const latestScreening = await db.palliativeScreeningRecord.findFirst({
      where: { palliativePatientId, ewsLevel: 'merah' },
      orderBy: { performedAt: 'desc' },
    });

    if (latestScreening) {
      const screeningDate = new Date(latestScreening.performedAt);
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
      if (screeningDate > threeDaysAgo) {
        riskLevel = 'merah';
      }
    }

    await db.palliativePatient.update({
      where: { id: palliativePatientId },
      data: { riskLevel },
    });
  } catch (error) {
    console.error('Risk level update error:', error);
  }
}
