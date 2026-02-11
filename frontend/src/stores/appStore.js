import { create } from 'zustand'
import { startOfWeek, endOfWeek, addWeeks, eachDayOfInterval } from 'date-fns'
import {
  getCorsi,
  getLezioneOverrides,
  createCorso as fbCreateCorso,
  updateCorso as fbUpdateCorso,
  deleteCorso as fbDeleteCorso,
  createPrenotazione as fbCreatePrenotazione,
  deletePrenotazione as fbDeletePrenotazione,
  getAllUsers as fbGetAllUsers,
  createUserProfile as fbCreateUserProfile,
  deleteUserProfile as fbDeleteUserProfile,
  getSpeseFisse as fbGetSpeseFisse,
  createSpesaFissa as fbCreateSpesaFissa,
  updateSpesaFissa as fbUpdateSpesaFissa,
  deleteSpesaFissa as fbDeleteSpesaFissa,
  getAllPersone as fbGetAllPersone,
  createPersona as fbCreatePersona,
  updatePersona as fbUpdatePersona,
  deletePersona as fbDeletePersona,
} from '../lib/firestore'
import { formatDate } from '../lib/calendar'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

function getTwoWeeksDates() {
  const now = new Date()
  const w0Start = startOfWeek(now, { weekStartsOn: 1 })
  const w1End = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })
  return eachDayOfInterval({ start: w0Start, end: w1End })
}

export const useAppStore = create((set, get) => ({
  // ─── State ─────────────────────────────────────────
  corsi: [],
  overrides: [],
  prenotazioni: [],       // all prenotazioni for the 2-week window
  users: [],
  usersLoaded: false,
  currentMonthPaidMap: {},
  spese: [],
  speseLoaded: false,
  anagrafica: [],
  anagraficaLoaded: false,
  anagraficaMonthPaidMap: {},
  loaded: false,
  loading: false,

  // ─── Init: load everything once ────────────────────
  init: async (userId) => {
    if (get().loaded || get().loading) return
    set({ loading: true })

    try {
      const corsiData = await getCorsi()

      // Load all overrides for all corsi in parallel
      const overridesArrays = await Promise.all(
        corsiData.map((c) => getLezioneOverrides(c.id))
      )
      const allOverrides = overridesArrays.flat()

      // Load all prenotazioni for the 2-week window in one batch
      const dates = getTwoWeeksDates()
      const dateStrings = dates.map(formatDate)

      // Firestore 'in' queries support max 30 values, we have 14 dates so one query is fine
      const prenSnap = await getDocs(
        query(collection(db, 'prenotazioni'), where('date', 'in', dateStrings))
      )
      const allPrenotazioni = prenSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      set({
        corsi: corsiData,
        overrides: allOverrides,
        prenotazioni: allPrenotazioni,
        loaded: true,
        loading: false,
      })
    } catch (err) {
      console.error('Store init error:', err)
      set({ loading: false })
    }
  },

  // ─── Selectors ─────────────────────────────────────
  getMyBookings: (userId) => {
    return get().prenotazioni.filter((p) => p.userId === userId)
  },

  getPrenotazioniForDate: (date) => {
    return get().prenotazioni.filter((p) => p.date === date)
  },

  getPrenotazioniForCorsoDate: (corsoId, date) => {
    return get().prenotazioni.filter((p) => p.corsoId === corsoId && p.date === date)
  },

  // ─── Mutations: update Firestore + local state ─────

  book: async ({ corsoId, date, userId, userName }) => {
    const docRef = await fbCreatePrenotazione({ corsoId, date, userId, userName })
    const newPren = { id: docRef.id, corsoId, date, userId, userName }
    set((s) => ({ prenotazioni: [...s.prenotazioni, newPren] }))
    return newPren
  },

  cancelBooking: async (prenotazioneId) => {
    await fbDeletePrenotazione(prenotazioneId)
    set((s) => ({
      prenotazioni: s.prenotazioni.filter((p) => p.id !== prenotazioneId),
    }))
  },

  // ─── Corsi mutations ──────────────────────────────
  addCorso: async (data) => {
    const docRef = await fbCreateCorso(data)
    const newCorso = { id: docRef.id, ...data, capacity: data.capacity || 10 }
    set((s) => ({ corsi: [...s.corsi, newCorso].sort((a, b) => a.name.localeCompare(b.name)) }))
    return newCorso
  },

  editCorso: async (corsoId, data) => {
    await fbUpdateCorso(corsoId, data)
    set((s) => ({
      corsi: s.corsi.map((c) => (c.id === corsoId ? { ...c, ...data } : c)),
    }))
  },

  removeCorso: async (corsoId) => {
    await fbDeleteCorso(corsoId)
    set((s) => ({
      corsi: s.corsi.filter((c) => c.id !== corsoId),
    }))
  },

  // ─── Users (admin only, loaded on demand) ──────────
  loadUsers: async () => {
    if (get().usersLoaded) return get().users
    const data = await fbGetAllUsers()
    set({ users: data, usersLoaded: true })
    return data
  },

  addUser: async (userId, data) => {
    await fbCreateUserProfile(userId, data)
    const newUser = { id: userId, ...data }
    set((s) => ({ 
      users: [...s.users, newUser].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
    }))
    return newUser
  },

  updateUserInStore: (userId, data) => {
    set((s) => ({
      users: s.users.map((u) => (u.id === userId ? { ...u, ...data } : u)),
    }))
  },

  removeUserFromStore: async (userId) => {
    await fbDeleteUserProfile(userId)
    set((s) => ({
      users: s.users.filter((u) => u.id !== userId),
    }))
  },

  setCurrentMonthPaid: (userId, paid) => {
    set((s) => ({
      currentMonthPaidMap: { ...s.currentMonthPaidMap, [userId]: paid },
    }))
  },

  setCurrentMonthPaidMap: (map) => {
    set({ currentMonthPaidMap: map })
  },

  // ─── Spese Fisse ────────────────────────────────────
  loadSpese: async () => {
    if (get().speseLoaded) return get().spese
    const data = await fbGetSpeseFisse()
    set({ spese: data, speseLoaded: true })
    return data
  },

  addSpesa: async (data) => {
    const docRef = await fbCreateSpesaFissa(data)
    const newSpesa = { id: docRef.id, ...data }
    set((s) => ({ 
      spese: [...s.spese, newSpesa].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    }))
    return newSpesa
  },

  editSpesa: async (spesaId, data) => {
    await fbUpdateSpesaFissa(spesaId, data)
    set((s) => ({
      spese: s.spese.map((sp) => (sp.id === spesaId ? { ...sp, ...data } : sp)),
    }))
  },

  removeSpesa: async (spesaId) => {
    await fbDeleteSpesaFissa(spesaId)
    set((s) => ({
      spese: s.spese.filter((sp) => sp.id !== spesaId),
    }))
  },

  // ─── Anagrafica (censimento persone) ──────────────────────────
  loadAnagrafica: async () => {
    if (get().anagraficaLoaded) return get().anagrafica
    const data = await fbGetAllPersone()
    set({ anagrafica: data, anagraficaLoaded: true })
    return data
  },

  addPersona: async (data) => {
    const docRef = await fbCreatePersona(data)
    const newPersona = { id: docRef.id, ...data, createdAt: new Date() }
    set((s) => ({ 
      anagrafica: [...s.anagrafica, newPersona].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '')
      )
    }))
    return newPersona
  },

  editPersona: async (personaId, data) => {
    await fbUpdatePersona(personaId, data)
    set((s) => ({
      anagrafica: s.anagrafica.map((p) => 
        p.id === personaId ? { ...p, ...data } : p
      )
    }))
  },

  removePersona: async (personaId) => {
    await fbDeletePersona(personaId)
    set((s) => ({
      anagrafica: s.anagrafica.filter((p) => p.id !== personaId)
    }))
  },

  updatePersonaInStore: (personaId, data) => {
    set((s) => ({
      anagrafica: s.anagrafica.map((p) => 
        p.id === personaId ? { ...p, ...data } : p
      )
    }))
  },

  setAnagraficaMonthPaid: (personaId, paid) => {
    set((s) => ({
      anagraficaMonthPaidMap: { ...s.anagraficaMonthPaidMap, [personaId]: paid }
    }))
  },

  setAnagraficaMonthPaidMap: (map) => {
    set({ anagraficaMonthPaidMap: map })
  },

  // ─── Force refresh (for edge cases) ───────────────
  refresh: async (userId) => {
    set({ loaded: false, loading: false })
    await get().init(userId)
  },
}))
