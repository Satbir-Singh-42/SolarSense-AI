import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User, loginSchema, signupSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type HealthStatus = {
  status: "healthy" | "unhealthy";
  message: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, z.infer<typeof loginSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, z.infer<typeof signupSchema>>;
  healthStatus: HealthStatus | null;
  checkHealth: () => Promise<HealthStatus | void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const status: HealthStatus = res.ok
        ? { status: "healthy", message: "Server is running" }
        : { status: "unhealthy", message: "Server returned error" };
      setHealthStatus(status);
      return status;
    } catch {
      const status: HealthStatus = {
        status: "unhealthy",
        message: "Cannot connect to server",
      };
      setHealthStatus(status);
      return status;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Health check every 5 minutes (reduced from 2 min — saves bandwidth)
    const id = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [checkHealth]);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Add session ID header if available (consistent with apiRequest)
        const headers: Record<string, string> = {};
        const sessionId = localStorage.getItem("sessionId");
        if (sessionId) {
          headers["x-session-id"] = sessionId;
        }

        const response = await fetch("/api/user", {
          headers,
          credentials: "include",
        });
        if (response.status === 401) {
          return null;
        }
        const data = await response.json();
        return data;
      } catch (error) {
        // Silently return null for authentication failures
        // No server health checks or toast notifications
        return null;
      }
    },
    retry: false,
    staleTime: 30000, // Cache auth status for 30 seconds
    gcTime: 60000, // Keep cached data for 1 minute
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      if (data.sessionId) {
        localStorage.setItem("sessionId", data.sessionId);
      }
      localStorage.removeItem("logoutSuccess");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof signupSchema>) => {
      const response = await apiRequest("POST", "/api/register", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      if (data.sessionId) {
        localStorage.setItem("sessionId", data.sessionId);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      localStorage.removeItem("authToken");
      localStorage.removeItem("sessionId");
      sessionStorage.clear();
      localStorage.setItem("logoutSuccess", "true");
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Server is down. Please try again later.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        healthStatus,
        checkHealth,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
