import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleTokens: any | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  connectGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleTokens, setGoogleTokens] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load stored Google OAuth tokens from Firestore
        const tokenDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (tokenDoc.exists() && tokenDoc.data().googleTokens) {
          setGoogleTokens(tokenDoc.data().googleTokens);
        }
      } else {
        setGoogleTokens(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS" && event.data.tokens) {
        setGoogleTokens(event.data.tokens);
        if (user) {
          await setDoc(
            doc(db, "users", user.uid),
            { googleTokens: event.data.tokens },
            { merge: true }
          );
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [user]);

  // Check for pending tokens (from redirect fallback)
  useEffect(() => {
    const pending = localStorage.getItem("pending_oauth_tokens");
    if (pending && user) {
      const tokens = JSON.parse(pending);
      setGoogleTokens(tokens);
      setDoc(doc(db, "users", user.uid), { googleTokens: tokens }, { merge: true });
      localStorage.removeItem("pending_oauth_tokens");
    }
  }, [user]);

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setGoogleTokens(null);
  };

  const connectGoogle = async () => {
    const res = await fetch(`/api/auth/url?origin=${window.location.origin}`);
    const { url } = await res.json();
    const popup = window.open(url, "google-auth", "width=500,height=600");
    if (!popup) {
      // Fallback: redirect
      window.location.href = url;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleTokens, signIn, signOut, connectGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
