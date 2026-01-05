import { PageProps } from "$fresh/server.ts";
import SidebarShell from "../islands/SidebarShell.tsx";

export default function Layout({ Component, state }: PageProps) {
  const currentPath = state?.path ?? "/";
  const userRole = state?.user?.role;

  return (
    <SidebarShell currentPath={currentPath} userRole={userRole}>
      <Component />
    </SidebarShell>
  );
}
