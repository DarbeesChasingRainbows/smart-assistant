import { createContext, useContext, useEffect, useState, ReactNode } from "preact/compat";
import { RetentionApiClient, User } from "./api.ts";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiClient] = useState(() => new RetentionApiClient());

  useEffect(() => {
    // Load tokens from storage and validate them
    const initializeAuth = () => {
      try {
        apiClient.loadTokensFromStorage();
        
        // Try to get current user info by making a test request
        // For now, we'll just check if tokens exist
        // In a real app, you might want a /me endpoint
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          // Token exists, user is considered logged in
          // You could decode the JWT to get user info or call a /me endpoint
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        apiClient.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [apiClient]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (displayName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(displayName, email, password);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = () => {
    // This would typically call a /me endpoint to get fresh user data
    // For now, we'll just reload the page
    globalThis.location.reload();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
