import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setUserProfile(null);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'user_profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          await setDoc(docRef, { id: user.uid });
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
      }
    };
    fetchProfile();
  }, [user]);

  const signInWithEmail = async (email: string, password: string, isSignUp: boolean) => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signInWithGithub = async () => {
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
    } catch (err: any) {
      console.error("GitHub Auth Error:", err);
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => signOut(auth);

  return {
    user, userProfile, authError, isAuthLoading,
    signInWithEmail, signInWithGoogle, signInWithGithub, logout
  };
}
