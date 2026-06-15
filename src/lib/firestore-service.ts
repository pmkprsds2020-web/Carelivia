// Firestore Service Layer — Single Source of Truth for all CareLivia data
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Unsubscribe,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Types ──────────────────────────────────────────────────────────────

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

// Helper to convert Firestore timestamp to JS Date
export function toJSDate(ts: Timestamp | FirestoreTimestamp | Date | string | undefined): Date | undefined {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  if ('seconds' in ts && 'nanoseconds' in ts) {
    return new Timestamp(ts.seconds, ts.nanoseconds).toDate();
  }
  return undefined;
}

// Helper to convert JS Date/string to Firestore Timestamp
export function toTimestamp(date: Date | string | undefined): Timestamp | undefined {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;
  return Timestamp.fromDate(d);
}

// ─── Generic CRUD Operations ────────────────────────────────────────────

/** Create a document with auto-generated ID */
export async function createDoc<T extends DocumentData>(
  collectionPath: string,
  data: T,
  useServerTimestamp = true
): Promise<string> {
  try {
    const docData = useServerTimestamp
      ? { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
      : { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, collectionPath), docData);
    return docRef.id;
  } catch (error) {
    console.error(`[Firestore] Error creating doc in ${collectionPath}:`, error);
    throw error;
  }
}

/** Create a document with a specific ID */
export async function setDocById<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: T,
  merge = true,
  useServerTimestamp = true
): Promise<void> {
  try {
    const docData = useServerTimestamp
      ? { ...data, updatedAt: serverTimestamp() }
      : { ...data, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, collectionPath, docId), docData, { merge });
  } catch (error) {
    console.error(`[Firestore] Error setting doc ${collectionPath}/${docId}:`, error);
    throw error;
  }
}

/** Read a single document */
export async function getDocById<T>(
  collectionPath: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  try {
    const docSnap = await getDoc(doc(db, collectionPath, docId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
    }
    return null;
  } catch (error) {
    console.error(`[Firestore] Error getting doc ${collectionPath}/${docId}:`, error);
    throw error;
  }
}

/** Read all documents in a collection with optional constraints */
export async function getCollection<T>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  try {
    const q = query(collection(db, collectionPath), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
  } catch (error) {
    console.error(`[Firestore] Error getting collection ${collectionPath}:`, error);
    throw error;
  }
}

/** Read documents by field value */
export async function getDocsByField<T>(
  collectionPath: string,
  field: string,
  value: unknown,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  try {
    const q = query(
      collection(db, collectionPath),
      where(field, '==', value),
      ...constraints
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
  } catch (error) {
    console.error(`[Firestore] Error querying ${collectionPath} by ${field}:`, error);
    throw error;
  }
}

/** Update a document */
export async function updateDocById<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: Partial<T>,
  useServerTimestamp = true
): Promise<void> {
  try {
    const updateData = useServerTimestamp
      ? { ...data, updatedAt: serverTimestamp() }
      : { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, collectionPath, docId), updateData);
  } catch (error) {
    console.error(`[Firestore] Error updating doc ${collectionPath}/${docId}:`, error);
    throw error;
  }
}

/** Delete a document */
export async function deleteDocById(
  collectionPath: string,
  docId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionPath, docId));
  } catch (error) {
    console.error(`[Firestore] Error deleting doc ${collectionPath}/${docId}:`, error);
    throw error;
  }
}

/** Real-time listener for a collection */
export function onCollectionSnapshot<T>(
  collectionPath: string,
  constraints: QueryConstraint[],
  callback: (data: (T & { id: string })[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, collectionPath), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
      callback(data);
    },
    (error) => {
      console.error(`[Firestore] onSnapshot error for ${collectionPath}:`, error);
      onError?.(error);
    }
  );
}

/** Real-time listener for a single document */
export function onDocSnapshot<T>(
  collectionPath: string,
  docId: string,
  callback: (data: (T & { id: string }) | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, collectionPath, docId),
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as T & { id: string });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`[Firestore] onDocSnapshot error for ${collectionPath}/${docId}:`, error);
      onError?.(error);
    }
  );
}

// ─── Collection Path Helpers ────────────────────────────────────────────

// Subcollection paths under patients/{patientId}
export const patientSubcollections = {
  ttv: (patientId: string) => `patients/${patientId}/ttv_serial`,
  keluhan: (patientId: string) => `patients/${patientId}/keluhan_harian`,
  nutrisi: (patientId: string) => `patients/${patientId}/nutrisi`,
  skrining: (patientId: string) => `patients/${patientId}/skrining_paliatif`,
  sosial: (patientId: string) => `patients/${patientId}/sosial`,
  acp: (patientId: string) => `patients/${patientId}/acp`,
  obat: (patientId: string) => `patients/${patientId}/obat`,
  chatMessages: (patientId: string) => `patients/${patientId}/chat_messages`,
  clinicalAlerts: (patientId: string) => `patients/${patientId}/clinical_alerts`,
  auditEntries: (patientId: string) => `patients/${patientId}/audit_entries`,
  resumes: (patientId: string) => `patients/${patientId}/resumes`,
  referrals: (patientId: string) => `patients/${patientId}/referrals`,
  caregivers: (patientId: string) => `patients/${patientId}/sosial/caregivers`,
  emergencyContacts: (patientId: string) => `patients/${patientId}/sosial/emergency_contacts`,
  familyMeetings: (patientId: string) => `patients/${patientId}/sosial/family_meetings`,
  financialSupport: (patientId: string) => `patients/${patientId}/sosial/financial_support`,
  transport: (patientId: string) => `patients/${patientId}/sosial/transport`,
  familyCoordination: (patientId: string) => `patients/${patientId}/sosial/family_coordination`,
  socialAlerts: (patientId: string) => `patients/${patientId}/sosial/social_alerts`,
  eduMaterials: (patientId: string) => `patients/${patientId}/sosial/edu_materials`,
  wearableDevices: (patientId: string) => `patients/${patientId}/wearable_devices`,
  wearableVitalData: (patientId: string, deviceId: string) => `patients/${patientId}/wearable_devices/${deviceId}/vital_data`,
  rvsmAlerts: (patientId: string) => `patients/${patientId}/rvsm_alerts`,
  rvsmEstimates: (patientId: string) => `patients/${patientId}/rvsm_estimates`,
  medicationAdherence: (patientId: string, medId: string) => `patients/${patientId}/obat/${medId}/adherence`,
  acpRevisions: (patientId: string, acpId: string) => `patients/${patientId}/acp/${acpId}/revisions`,
} as const;

// ─── Specific Palliative CRUD ───────────────────────────────────────────

// Patients
export const patientsService = {
  collection: 'patients',

  async create(data: Record<string, unknown>) {
    return createDoc(this.collection, data);
  },

  async getAll() {
    return getCollection<Record<string, unknown>>(this.collection, [orderBy('createdAt', 'desc')]);
  },

  async getById(id: string) {
    return getDocById<Record<string, unknown>>(this.collection, id);
  },

  async update(id: string, data: Record<string, unknown>) {
    return updateDocById(this.collection, id, data);
  },

  async delete(id: string) {
    return deleteDocById(this.collection, id);
  },

  onSnapshot(callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection,
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// TTV Serial
export const ttvService = {
  collection: (patientId: string) => patientSubcollections.ttv(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Keluhan Harian
export const keluhanService = {
  collection: (patientId: string) => patientSubcollections.keluhan(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Nutrisi
export const nutrisiService = {
  collection: (patientId: string) => patientSubcollections.nutrisi(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Skrining Paliatif
export const skriningService = {
  collection: (patientId: string) => patientSubcollections.skrining(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Sosial
export const sosialService = {
  collection: (patientId: string) => patientSubcollections.sosial(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  async update(patientId: string, docId: string, data: Record<string, unknown>) {
    return updateDocById(this.collection(patientId), docId, data);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// ACP
export const acpService = {
  collection: (patientId: string) => patientSubcollections.acp(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  async update(patientId: string, docId: string, data: Record<string, unknown>) {
    return updateDocById(this.collection(patientId), docId, data);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Obat
export const obatService = {
  collection: (patientId: string) => patientSubcollections.obat(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  async update(patientId: string, docId: string, data: Record<string, unknown>) {
    return updateDocById(this.collection(patientId), docId, data);
  },

  async delete(patientId: string, docId: string) {
    return deleteDocById(this.collection(patientId), docId);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Chat Messages
export const chatService = {
  collection: (patientId: string) => patientSubcollections.chatMessages(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'asc')]);
  },

  async update(patientId: string, docId: string, data: Record<string, unknown>) {
    return updateDocById(this.collection(patientId), docId, data);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'asc')],
      callback
    );
  },
};

// Clinical Alerts
export const clinicalAlertsService = {
  collection: (patientId: string) => patientSubcollections.clinicalAlerts(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  async markRead(patientId: string, alertId: string) {
    return updateDocById(this.collection(patientId), alertId, { isRead: true });
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Audit Entries
export const auditService = {
  collection: (patientId: string) => patientSubcollections.auditEntries(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },
};

// Resumes
export const resumeService = {
  collection: (patientId: string) => patientSubcollections.resumes(patientId),

  async create(patientId: string, data: Record<string, unknown>) {
    return createDoc(this.collection(patientId), data);
  },

  async getAll(patientId: string) {
    return getCollection<Record<string, unknown>>(this.collection(patientId), [orderBy('createdAt', 'desc')]);
  },

  async update(patientId: string, docId: string, data: Record<string, unknown>) {
    return updateDocById(this.collection(patientId), docId, data);
  },

  onSnapshot(patientId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection(patientId),
      [orderBy('createdAt', 'desc')],
      callback
    );
  },
};

// Users
export const usersService = {
  collection: 'users',

  async create(data: Record<string, unknown>, userId?: string) {
    if (userId) {
      await setDocById(this.collection, userId, data);
      return userId;
    }
    return createDoc(this.collection, data);
  },

  async getAll() {
    return getCollection<Record<string, unknown>>(this.collection, [orderBy('createdAt', 'desc')]);
  },

  async getById(id: string) {
    return getDocById<Record<string, unknown>>(this.collection, id);
  },

  async update(id: string, data: Record<string, unknown>) {
    return updateDocById(this.collection, id, data);
  },
};

// Notifications
export const notificationsService = {
  collection: 'notifications',

  async create(data: Record<string, unknown>) {
    return createDoc(this.collection, data);
  },

  async getByUser(userId: string) {
    return getDocsByField<Record<string, unknown>>(this.collection, 'userId', userId, [orderBy('createdAt', 'desc')]);
  },

  async markRead(notifId: string) {
    return updateDocById(this.collection, notifId, { isRead: true });
  },

  onSnapshot(userId: string, callback: (data: (Record<string, unknown> & { id: string })[]) => void) {
    return onCollectionSnapshot<Record<string, unknown>>(
      this.collection,
      [where('userId', '==', userId), orderBy('createdAt', 'desc')],
      callback
    );
  },
};
