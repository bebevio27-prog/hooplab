import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── Corsi ───────────────────────────────────────────────

/**
 * Corso shape:
 * {
 *   name: string,
 *   description: string,
 *   color: string (hex),
 *   capacity: number (default 10),
 *   schedule: [{ dayOfWeek: 0-6, startTime: "HH:mm", endTime: "HH:mm" }],
 *   createdAt: Timestamp,
 * }
 */

export async function createCorso(data) {
  return addDoc(collection(db, 'corsi'), {
    ...data,
    capacity: data.capacity || 10,
    createdAt: serverTimestamp(),
  })
}

export async function updateCorso(corsoId, data) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  return updateDoc(doc(db, 'corsi', corsoId), cleanData)
}

export async function deleteCorso(corsoId) {
  return deleteDoc(doc(db, 'corsi', corsoId))
}

export async function getCorsi() {
  const snap = await getDocs(query(collection(db, 'corsi'), orderBy('name')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAllUtenti() {
  const snap = await getDocs(query(collection(db, 'utenti'), orderBy('name')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getCorso(corsoId) {
  const snap = await getDoc(doc(db, 'corsi', corsoId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ─── Lezioni (overrides for single occurrences) ─────────

/**
 * Lezione override shape:
 * {
 *   corsoId: string,
 *   originalDate: "YYYY-MM-DD",
 *   newStartTime: "HH:mm" | null,
 *   newEndTime: "HH:mm" | null,
 *   cancelled: boolean,
 * }
 *
 * If no override doc exists for a date, the lesson runs as per corso schedule.
 */

export async function getLezioneOverrides(corsoId) {
  const snap = await getDocs(
    query(collection(db, 'lezioneOverrides'), where('corsoId', '==', corsoId))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function setLezioneOverride(data) {
  const q = query(
    collection(db, 'lezioneOverrides'),
    where('corsoId', '==', data.corsoId),
    where('originalDate', '==', data.originalDate)
  )
  const snap = await getDocs(q)
  if (snap.empty) {
    return addDoc(collection(db, 'lezioneOverrides'), data)
  } else {
    return updateDoc(snap.docs[0].ref, data)
  }
}

export async function deleteLezioneOverride(overrideId) {
  return deleteDoc(doc(db, 'lezioneOverrides', overrideId))
}

// ─── Prenotazioni ────────────────────────────────────────

/**
 * Prenotazione shape:
 * {
 *   corsoId: string,
 *   date: "YYYY-MM-DD",
 *   userId: string,
 *   userName: string,
 *   createdAt: Timestamp,
 * }
 */

export async function createPrenotazione(data) {
  return addDoc(collection(db, 'prenotazioni'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function deletePrenotazione(prenotazioneId) {
  return deleteDoc(doc(db, 'prenotazioni', prenotazioneId))
}

export async function getPrenotazioniByDate(date) {
  const snap = await getDocs(
    query(collection(db, 'prenotazioni'), where('date', '==', date))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPrenotazioniByUser(userId) {
  const snap = await getDocs(
    query(collection(db, 'prenotazioni'), where('userId', '==', userId))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPrenotazioniByCorsoAndDate(corsoId, date) {
  const snap = await getDocs(
    query(
      collection(db, 'prenotazioni'),
      where('corsoId', '==', corsoId),
      where('date', '==', date)
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── Users ───────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getUserProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUserProfile(userId, data) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  return updateDoc(doc(db, 'users', userId), cleanData)
}

export async function createUserProfile(userId, data) {
  return setDoc(doc(db, 'users', userId), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function deleteUserProfile(userId) {
  // Delete user document
  await deleteDoc(doc(db, 'users', userId))
  
  // Delete all user's prenotazioni
  const prenotazioniSnap = await getDocs(
    query(collection(db, 'prenotazioni'), where('userId', '==', userId))
  )
  await Promise.all(prenotazioniSnap.docs.map(d => deleteDoc(d.ref)))
  
  // Delete all user's payments
  const paymentsSnap = await getDocs(collection(db, 'users', userId, 'payments'))
  await Promise.all(paymentsSnap.docs.map(d => deleteDoc(d.ref)))
}

// ─── Pagamenti ───────────────────────────────────────────

/**
 * For "mensile" users:
 * payments subcollection: users/{uid}/payments/{YYYY-MM}
 * { paid: boolean, updatedAt: Timestamp }
 *
 * For "per-lesson" users:
 * users/{uid} has fields:
 * { lessonsAttended: number, lessonsPaid: number }
 * Delta = lessonsAttended - lessonsPaid
 */

export async function setMonthlyPaymentStatus(userId, yearMonth, paid) {
  const ref = doc(db, 'users', userId, 'payments', yearMonth)
  return setDoc(ref, { paid, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getMonthlyPayments(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'payments'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updatePerLessonCounts(userId, lessonsAttended, lessonsPaid) {
  return updateDoc(doc(db, 'users', userId), { lessonsAttended, lessonsPaid })
}

// ─── Spese Fisse ─────────────────────────────────────────

/**
 * Spesa Fissa shape:
 * {
 *   type: 'affitto' | 'bolletta_luce' | 'bolletta_acqua' | 'bolletta_gas' | 'altro',
 *   amount: number,
 *   yearMonth: 'YYYY-MM',
 *   description: string,
 *   createdAt: Timestamp,
 * }
 */

export async function createSpesaFissa(data) {
  return addDoc(collection(db, 'speseFisse'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateSpesaFissa(spesaId, data) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  return updateDoc(doc(db, 'speseFisse', spesaId), cleanData)
}

export async function deleteSpesaFissa(spesaId) {
  return deleteDoc(doc(db, 'speseFisse', spesaId))
}

export async function getSpeseFisse() {
  const snap = await getDocs(query(collection(db, 'speseFisse'), orderBy('yearMonth', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getSpeseFisseByMonth(yearMonth) {
  const snap = await getDocs(
    query(collection(db, 'speseFisse'), where('yearMonth', '==', yearMonth))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── Lista Utenti da Creare ───

/**
 * L'admin aggiunge utenti a una lista "pendingUsers"
 * Questi utenti vengono poi creati manualmente dall'admin via Firebase Console
 * O possono auto-registrarsi e il sistema assegna i dati dalla lista pending
 */

export async function addPendingUser(data) {
  const pendingId = doc(collection(db, 'pendingUsers')).id
  
  await setDoc(doc(db, 'pendingUsers', pendingId), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  
  return pendingId
}

export async function getPendingUsers() {
  const snap = await getDocs(collection(db, 'pendingUsers'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deletePendingUser(pendingId) {
  return deleteDoc(doc(db, 'pendingUsers', pendingId))
}

export async function updatePendingUser(pendingId, data) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  return updateDoc(doc(db, 'pendingUsers', pendingId), cleanData)
}

// ─── Censimento (anagrafica indipendente) ─────────────────
/**
 * Persona censimento shape:
 * {
 *   nome: string,
 *   cognome: string,
 *   paymentType: 'mensile' | 'per-lesson',
 *   // mensile: subcollection payments/{YYYY-MM} → { paid: boolean }
 *   // per-lesson: { lessonsPaid: number }
 *   note: string,
 *   createdAt: Timestamp,
 * }
 */

export async function getCensimento() {
  const snap = await getDocs(query(collection(db, 'censimento'), orderBy('cognome')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addCensimentoPersona(data) {
  const personaData = {
    ...data,
    createdAt: serverTimestamp(),
  }
  
  // Aggiungi lessonsPaid solo per paymentType 'per-lesson'
  if (data.paymentType === 'per-lesson') {
    personaData.lessonsPaid = data.lessonsPaid || 0
  }
  
  return addDoc(collection(db, 'censimento'), personaData)
}

export async function updateCensimentoPersona(personaId, data) {
  // Rimuovi campi undefined prima di aggiornare
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  return updateDoc(doc(db, 'censimento', personaId), cleanData)
}

export async function deleteCensimentoPersona(personaId) {
  // Elimina anche i pagamenti mensili
  const paymentsSnap = await getDocs(collection(db, 'censimento', personaId, 'payments'))
  await Promise.all(paymentsSnap.docs.map(d => deleteDoc(d.ref)))
  return deleteDoc(doc(db, 'censimento', personaId))
}

export async function getCensimentoPayments(personaId) {
  const snap = await getDocs(collection(db, 'censimento', personaId, 'payments'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function setCensimentoMonthPaid(personaId, yearMonth, paid) {
  const ref = doc(db, 'censimento', personaId, 'payments', yearMonth)
  return setDoc(ref, { paid, updatedAt: serverTimestamp() }, { merge: true })
}

// Alias per compatibilità
export { getCensimento as getAllPersone }
export { addCensimentoPersona as createPersona }
export { updateCensimentoPersona as updatePersona }
export { deleteCensimentoPersona as deletePersona }
