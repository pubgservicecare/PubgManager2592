import { createContext, useContext, ReactNode } from "react";
import { useGetMe, useAdminLogout, MeResponse } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: MeResponse | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    } as any
  });

  const logoutMutation = useAdminLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/admin/login");
      }
    }
  });

  const value = {
    user: user || null,
    isLoading,
    logout: () => logoutMutation.mutate()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
