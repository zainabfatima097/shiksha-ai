
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: 'teacher' | 'student';
    class?: string;
    section?: string;
    rollNumber?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function MissingConfigMessage() {
    return (
         <div className="flex h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-card p-8 text-center shadow-lg">
            <h1 className="text-2xl font-bold text-destructive">Configuration Incomplete</h1>
            <p className="mt-4 text-muted-foreground">
              Your Firebase API keys are missing from the <code>.env</code> file. The application cannot connect to authentication or database services without them.
            </p>
            <p className="mt-4 text-sm">
              Please copy the configuration from your Firebase project settings into your <code>.env</code> file.
            </p>
            <div className="mt-6 rounded-md bg-muted p-4 text-left font-mono text-xs text-muted-foreground">
                <code>
                    GOOGLE_API_KEY=...<br />
                    NEXT_PUBLIC_FIREBASE_API_KEY=...<br />
                    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...<br />
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...<br />
                    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...<br />
                    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...<br />
                    NEXT_PUBLIC_FIREBASE_APP_ID=...
                </code>
            </div>
             <p className="mt-4 text-xs text-muted-foreground">
                You can find the <code>NEXT_PUBLIC_FIREBASE_...</code> values in your Firebase project's settings page. The <code>GOOGLE_API_KEY</code> is used for AI features and can be created in Google AI Studio.
            </p>
          </div>
        </div>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth && db) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        if (user) {
          // Fetch profile
          let userProfile: UserProfile | null = null;
          try {
            // Try fetching from 'teachers' collection first
            let docRef = doc(db, 'teachers', user.uid);
            let docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                userProfile = docSnap.data() as UserProfile;
            } else {
                // If not found, try 'students' collection
                docRef = doc(db, 'students', user.uid);
                docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    userProfile = docSnap.data() as UserProfile;
                }
            }
          } catch(e) {
            console.error("Failed to fetch user profile", e)
          }
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  if (!isFirebaseConfigured) {
    return <MissingConfigMessage />;
  }

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
