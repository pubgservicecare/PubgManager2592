import { useState, useEffect } from "react";
import { useAdminLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Gamepad2, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();

  useEffect(() => {
    if (user?.authenticated) {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: () => {
        window.location.href = "/admin"; // full reload to refresh auth context cleanly
      },
      onError: (error) => {
        setErrorMsg((error as any).response?.data?.error || "Login failed");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    loginMutation.mutate({ data: { username, password } });
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <img 
        src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
        alt="Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card/80 backdrop-blur-xl p-8 rounded-3xl border border-border shadow-2xl z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Gamepad2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-widest">SYSTEM LOGIN</h1>
          <p className="text-muted-foreground mt-1 font-medium">Authorized personnel only</p>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-xl mb-6 text-sm font-bold text-center animate-in shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-background border-2 border-border focus:border-primary rounded-xl pl-12 pr-4 py-3 text-white outline-none transition-colors"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-background border-2 border-border focus:border-primary rounded-xl pl-12 pr-4 py-3 text-white outline-none transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {loginMutation.isPending ? "AUTHENTICATING..." : "ACCESS SYSTEM"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
