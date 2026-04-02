import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Heart, User, ArrowRight, CheckCircle2, Shield,
  Mail, Lock, Eye, EyeOff, Loader2,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ── Tiny benefit item ─────────────────────────────────────────────────────────
const BenefitItem = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-white/80 text-sm">
    <CheckCircle2 className="w-4 h-4 text-white/60 flex-shrink-0" />
    {text}
  </li>
);

// ── Tab button ────────────────────────────────────────────────────────────────
const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
      active
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
        : "text-muted-foreground hover:text-foreground"
    }`}
  >
    {label}
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const Auth = () => {
  const [mode, setMode] = useState<"signup" | "login">("signup");

  // Signup fields
  const [firstName,     setFirstName]     = useState("");
  const [lastName,      setLastName]      = useState("");
  const [signupEmail,   setSignupEmail]   = useState("");
  const [signupPassword,setSignupPassword]= useState("");
  const [confirmPass,   setConfirmPass]   = useState("");
  const [showSignupPass,setShowSignupPass]= useState(false);

  // Login fields
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { toast }  = useToast();
  const navigate   = useNavigate();

  // ── SIGN UP ─────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Missing Info", description: "Please enter your full name.", variant: "destructive" }); return;
    }
    if (signupPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" }); return;
    }
    if (signupPassword !== confirmPass) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" }); return;
    }

    setIsLoading(true);
    try {
      // 1. Create Firebase user
      const cred = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);

      // 2. Set display name
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });

      // 3. Save profile to Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        firstName,
        lastName,
        email:     signupEmail,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Account Created! 🎉", description: `Welcome to MediMate, ${firstName}!` });
      navigate("/chat");
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use" ? "This email is already registered. Try logging in." :
        err.code === "auth/invalid-email"        ? "Please enter a valid email address." :
        err.code === "auth/weak-password"        ? "Password is too weak. Use at least 6 characters." :
        err.message || "Something went wrong. Please try again.";
      toast({ title: "Signup Failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast({ title: "Missing Info", description: "Please enter your email and password.", variant: "destructive" }); return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast({ title: "Welcome back! ", description: "You have been signed in successfully." });
      navigate("/chat");
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found"   ? "No account found with this email." :
        err.code === "auth/wrong-password"   ? "Incorrect password. Please try again." :
        err.code === "auth/invalid-email"    ? "Please enter a valid email address." :
        err.code === "auth/too-many-requests"? "Too many failed attempts. Please try again later." :
        err.code === "auth/invalid-credential" ? "Invalid email or password." :
        err.message || "Login failed. Please try again.";
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    "AI-powered symptom analysis",
    "Connect with verified doctors",
    "24/7 health chat support",
    "Private & encrypted data",
    "Multi-language support",
  ];

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-12px); }
        }
        .anim-in { animation: fadeSlideUp 0.55s ease both; }
        .blob1   { animation: float 8s  ease-in-out infinite;    }
        .blob2   { animation: float 11s ease-in-out infinite 2s; }
        .blob3   { animation: float 9s  ease-in-out infinite 4s; }
      `}</style>

      <div className="min-h-screen bg-background flex">

        {/* ── LEFT: brand panel ── */}
        <div className="hidden lg:flex lg:w-[45%] relative bg-primary overflow-hidden flex-col items-center justify-center p-12">
          <div className="blob1 absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-white/10" />
          <div className="blob2 absolute bottom-[-60px] right-[-60px] w-56 h-56 rounded-full bg-white/8" />
          <div className="blob3 absolute top-1/2 right-[-40px] w-40 h-40 rounded-full bg-white/6" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.15) 1px,transparent 1px)`,
            backgroundSize: "40px 40px",
          }} />
          <div className="relative z-10 max-w-sm text-center lg:text-left">
            <div className="flex items-center gap-3 mb-12 justify-center lg:justify-start">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">MediMate</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-snug mb-4">
              Your personal health companion
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-10">
              Get instant AI-powered medical guidance, find trusted doctors, and take control of your wellness.
            </p>
            <ul className="space-y-3">
              {benefits.map((b) => <BenefitItem key={b} text={b} />)}
            </ul>
            <div className="mt-12 pt-8 border-t border-white/20 flex items-center gap-4">
              <div className="flex -space-x-2">
                {["A","B","C","D"].map((l) => (
                  <div key={l} className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center text-xs font-bold text-white">{l}</div>
                ))}
              </div>
              <span className="text-white/70 text-sm">Joined by <span className="text-white font-semibold">50,000+</span> users</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: form panel ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/6 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/4 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-md relative z-10 anim-in">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">
                Medi<span className="text-primary">Mate</span>
              </span>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-muted/50 rounded-2xl p-1.5 mb-8">
              <Tab label="Create Account" active={mode === "signup"} onClick={() => setMode("signup")} />
              <Tab label="Log In"         active={mode === "login"}  onClick={() => setMode("login")}  />
            </div>

            {/* ── SIGN UP FORM ── */}
            {mode === "signup" && (
              <div className="anim-in">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
                  <p className="text-muted-foreground text-sm">Sign up with your email and password.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="firstName" type="text" placeholder="John" value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-9 h-11 bg-background/70" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="lastName" type="text" placeholder="Doe" value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="pl-9 h-11 bg-background/70" required />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signupEmail" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signupEmail" type="email" placeholder="john@example.com" value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-9 h-11 bg-background/70" required />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signupPassword" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signupPassword" type={showSignupPass ? "text" : "password"}
                        placeholder="Min. 6 characters" value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-9 pr-10 h-11 bg-background/70" required />
                      <button type="button" onClick={() => setShowSignupPass(!showSignupPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSignupPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPass" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="confirmPass" type={showSignupPass ? "text" : "password"}
                        placeholder="Re-enter password" value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="pl-9 h-11 bg-background/70" required />
                    </div>
                  </div>

                  {/* Security note */}
                  <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    Your information is encrypted and never shared with third parties.
                  </div>

                  <Button type="submit" disabled={isLoading}
                    className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20">
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account…</>
                      : <><span>Create Account</span><ArrowRight className="w-4 h-4 ml-2" /></>
                    }
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Log in</button>
                </p>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode === "login" && (
              <div className="anim-in">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
                  <p className="text-muted-foreground text-sm">Sign in to continue to MediMate.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="loginEmail" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="loginEmail" type="email" placeholder="john@example.com" value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-9 h-11 bg-background/70" required />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="loginPassword" className="text-sm font-medium">Password</Label>
                      <button type="button" className="text-xs text-primary hover:underline font-medium">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="loginPassword" type={showLoginPass ? "text" : "password"}
                        placeholder="Enter your password" value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-9 pr-10 h-11 bg-background/70" required />
                      <button type="button" onClick={() => setShowLoginPass(!showLoginPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading}
                    className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20">
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
                      : <><span>Sign In</span><ArrowRight className="w-4 h-4 ml-2" /></>
                    }
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-6">
                  New to MediMate?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Create an account</button>
                </p>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-8 px-4">
              By continuing, you agree to our{" "}
              <a href="#" className="hover:text-foreground underline underline-offset-2">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="hover:text-foreground underline underline-offset-2">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;