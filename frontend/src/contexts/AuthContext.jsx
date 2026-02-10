import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAppStore } from '../stores/appStore'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function ensureUserDoc(user) {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || '',
        role: 'user',
        paymentType: 'per-lesson',
        notes: '',
        createdAt: serverTimestamp(),
      })
      return { email: user.email, displayName: user.displayName || '', role: 'user', paymentType: 'per-lesson', notes: '' }
    }
    return userSnap.data()
  }

  async function signup(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    await ensureUserDoc(cred.user)
    return cred
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider)
    await ensureUserDoc(cred.user)
    return cred
  }

  function logout() {
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const profile = await ensureUserDoc(user)
        setUserProfile({ ...profile, isAdmin: profile.role === 'admin' })
        useAppStore.getState().init(user.uid)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    isAdmin: userProfile?.isAdmin || false,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
