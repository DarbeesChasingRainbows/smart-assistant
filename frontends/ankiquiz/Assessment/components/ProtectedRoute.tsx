import { useAuth } from "../utils/auth.tsx";

interface ProtectedRouteProps {
  children: preact.ComponentChildren;
  fallback?: preact.ComponentChildren;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p class="text-gray-600 mb-6">Please sign in to access this page.</p>
          <a
            href="/login"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
