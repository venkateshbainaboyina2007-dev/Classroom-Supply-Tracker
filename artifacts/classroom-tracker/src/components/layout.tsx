import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Archive, 
  AlertTriangle, 
  ClipboardList, 
  PackagePlus,
  Layers,
  PackageX,
  School
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Classrooms", href: "/classrooms", icon: School },
    { name: "Supplies", href: "/supplies", icon: Archive },
    { name: "Stock", href: "/stock", icon: Layers },
    { name: "Out of Stock", href: "/out-of-stock", icon: PackageX },
    { name: "Low Stock", href: "/low-stock", icon: AlertTriangle },
    { name: "Usage Log", href: "/usage", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 font-semibold text-xl text-sidebar-foreground tracking-tight">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <PackagePlus className="w-5 h-5" />
            </div>
            Classroom
          </Link>
        </div>
        
        <nav className="px-4 py-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => {
            const isActive = location === item.href || 
                             (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
