import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import type { MenuItem } from "../routes/menuTypes.ts";
import { getMenuItemsByRole } from "../routes/menuConfig.ts";

interface Props {
  children: ComponentChildren;
  currentPath: string;
  userRole?: string;
}

function MenuItemView(
  { item, currentPath, userRole }: {
    item: MenuItem;
    currentPath: string;
    userRole?: string;
  },
) {
  const [expanded, setExpanded] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(href + "/");
  };

  const childActive = useMemo(() => {
    return item.children?.some((c) => isActive(c.href)) ?? false;
  }, [item.children, currentPath]);

  const hasChildren = (item.children?.length ?? 0) > 0;
  const active = isActive(item.href);

  // Auto-expand if child is active
  const isExpanded = expanded || childActive;

  if (hasChildren) {
    return (
      <div class="collapse collapse-arrow">
        <input
          type="checkbox"
          checked={isExpanded}
          onChange={(e: Event) =>
            setExpanded((e.currentTarget as HTMLInputElement).checked)}
        />
        <div
          class={
            "collapse-title flex items-center gap-3 min-h-0 py-3 rounded-lg " +
            (childActive
              ? "bg-primary text-primary-content font-medium"
              : "text-base-content hover:bg-base-200")
          }
        >
          {item.icon && <span class={`icon ${item.icon}`}></span>}
          <span class="flex-1">{item.label}</span>
          {item.badge && <span class="badge badge-primary badge-sm">{item.badge}</span>}
        </div>
        <div class="collapse-content">
          <div class="ml-4 mt-1 space-y-1">
            {(item.children ?? [])
              .filter((c) => !c.requiredRole || !userRole || c.requiredRole === userRole)
              .map((child) => (
                <MenuItemView
                  key={child.id}
                  item={child}
                  currentPath={currentPath}
                  userRole={userRole}
                />
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={item.href}
      class={
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 " +
        (active
          ? "bg-primary text-primary-content font-medium"
          : "text-base-content hover:bg-base-200")
      }
    >
      {item.icon && <span class={`icon ${item.icon}`}></span>}
      <span class="flex-1">{item.label}</span>
      {item.badge && <span class="badge badge-primary badge-sm">{item.badge}</span>}
    </a>
  );
}

function Menu(
  { items, currentPath, userRole }: {
    items: MenuItem[];
    currentPath: string;
    userRole?: string;
  },
) {
  return (
    <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
      {items.map((item) => (
        <MenuItemView
          key={item.id}
          item={item}
          currentPath={currentPath}
          userRole={userRole}
        />
      ))}
    </nav>
  );
}

export default function SidebarShell({ children, currentPath, userRole }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(() => getMenuItemsByRole(userRole), [userRole]);

  return (
    <div class="min-h-screen bg-base-200" data-theme="light">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          class="fixed inset-0 bg-black/40 z-40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        class={
          "fixed left-0 top-0 h-full bg-base-100 border-r border-base-300 z-50 " +
          "transition-all duration-300 " +
          (collapsed ? "w-20" : "w-64") +
          " " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full") +
          " md:translate-x-0"
        }
      >
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between p-4 border-b border-base-300">
            {!collapsed && <h1 class="text-xl font-bold text-base-content">LifeOS</h1>}
            <button
              type="button"
              class="btn btn-ghost btn-square btn-sm"
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed((v) => !v)}
            >
              <span class={`icon ${collapsed ? "icon-menu" : "icon-x"}`}></span>
            </button>
          </div>

          <Menu items={items} currentPath={currentPath} userRole={userRole} />

          <div class="p-4 border-t border-base-300 mt-auto">
            <div class="dropdown dropdown-top">
              <div tabIndex={0} role="button" class="btn btn-ghost w-full justify-start">
                <div class="avatar avatar-placeholder">
                  <div class="w-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
                    <span class="text-sm font-medium">U</span>
                  </div>
                </div>
                {!collapsed && (
                  <div class="flex flex-col items-start ml-3">
                    <span class="text-sm font-medium">User</span>
                    <span class="text-xs opacity-70">user@example.com</span>
                  </div>
                )}
              </div>
              <ul
                tabIndex={0}
                class="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-52 mt-2"
              >
                <li><a href="/settings/profile">Profile</a></li>
                <li><a href="/settings">Settings</a></li>
                <li><a href="/settings/security">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        class={
          "transition-all duration-300 " +
          (collapsed ? "md:ml-20" : "md:ml-64")
        }
      >
        <header class="sticky top-0 z-30 bg-base-100 border-b border-base-300">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="btn btn-ghost btn-square btn-sm md:hidden"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <span class="icon icon-menu"></span>
              </button>

              <div class="hidden md:flex">
                <div class="form-control">
                  <div class="input-group input-group-sm">
                    <span class="bg-base-200">
                      <span class="icon icon-search"></span>
                    </span>
                    <input
                      type="text"
                      placeholder="Search..."
                      class="input input-bordered input-sm w-64 lg:w-96"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="dropdown dropdown-end">
                <div tabIndex={0} role="button" class="btn btn-ghost btn-circle btn-sm">
                  <div class="indicator">
                    <span class="icon icon-bell"></span>
                    <span class="badge badge-xs badge-primary indicator-item">3</span>
                  </div>
                </div>
                <div
                  tabIndex={0}
                  class="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-80 mt-2"
                >
                  <div class="px-4 py-2 border-b border-base-300">
                    <h3 class="font-medium">Notifications</h3>
                  </div>
                  <ul>
                    <li>
                      <a class="flex items-start gap-3 p-3">
                        <div class="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div class="flex-1">
                          <p class="text-sm">New transaction added</p>
                          <p class="text-xs opacity-70">2 minutes ago</p>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a class="flex items-start gap-3 p-3">
                        <div class="w-2 h-2 rounded-full bg-warning mt-2"></div>
                        <div class="flex-1">
                          <p class="text-sm">Budget limit reached</p>
                          <p class="text-xs opacity-70">1 hour ago</p>
                        </div>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <label class="swap swap-rotate btn btn-ghost btn-circle btn-sm">
                <input type="checkbox" class="theme-controller" value="dark" />
                <svg
                  class="swap-off w-5 h-5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
                </svg>
                <svg
                  class="swap-on w-5 h-5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
                </svg>
              </label>
            </div>
          </div>
        </header>

        <main class="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
