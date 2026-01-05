import { define } from "../utils.ts";
import SidebarShell from "../islands/SidebarShell.tsx";
import GlossaryAutoLinker from "../islands/GlossaryAutoLinker.tsx";
import { glossaryTerms } from "../lib/glossary.ts";

export default define.layout(({ Component, state }) => {
  const currentPath = state.path ?? "/";
  const userRole = state.user?.role;

  if (currentPath === "/") {
    return <Component />;
  }

  return (
    <SidebarShell currentPath={currentPath} userRole={userRole}>
      <GlossaryAutoLinker terms={glossaryTerms} />
      <Component />
    </SidebarShell>
  );
});
