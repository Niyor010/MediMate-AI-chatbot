import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserProfile {
  firstName: string;
  lastName:  string;
  email:     string;
}

interface AuthContextType {
  user:        User | null;
  profile:     UserProfile | null;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user:        null,
  profile:     null,
  authLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load profile from Firestore
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) setProfile(snap.data() as UserProfile);
        } catch { /* ignore */ }
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);