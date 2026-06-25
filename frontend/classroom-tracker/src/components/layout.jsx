import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Archive, AlertTriangle, ClipboardList, PackagePlus, Layers, PackageX, School, ShieldAlert, LogOut, Users, Bell, Check, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useListNotifications, useReadAllNotifications, useReadNotification, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
function NotificationBell() {
    const queryClient = useQueryClient();
    const { data: notifications = [], isLoading } = useListNotifications({
        query: {
            queryKey: getListNotificationsQueryKey(),
            refetchInterval: 10000, // Poll every 10 seconds
        }
    });
    const readAllMutation = useReadAllNotifications();
    const readSingleMutation = useReadNotification();
    const unreadCount = Array.isArray(notifications)
        ? notifications.filter((n) => !n.read).length
        : 0;
    const notificationsList = Array.isArray(notifications) ? notifications : [];
    const handleMarkAllRead = () => {
        readAllMutation.mutate(undefined, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
            }
        });
    };
    const handleMarkSingleRead = (id) => {
        readSingleMutation.mutate({ id }, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
            }
        });
    };
    return (<Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent rounded-full">
          <Bell className="w-5 h-5 text-muted-foreground"/>
          {unreadCount > 0 && (<span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-[10px] text-destructive-foreground font-extrabold flex items-center justify-center rounded-full">
              {unreadCount}
            </span>)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-border bg-popover shadow-xl" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (<Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-7 text-primary hover:text-primary/80 hover:bg-primary/10" disabled={readAllMutation.isPending}>
              Mark all read
            </Button>)}
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {isLoading ? (<div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
            </div>) : notificationsList.length > 0 ? (notificationsList.map((n) => (<div key={n.id} className={cn("p-3 flex items-start gap-3 transition-colors", n.read ? "bg-popover opacity-70" : "bg-muted/30 hover:bg-muted/50")}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed font-medium">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {!n.read && (<Button variant="ghost" size="icon" onClick={() => handleMarkSingleRead(n.id)} className="h-6 w-6 shrink-0 text-muted-foreground hover:text-emerald-600 rounded-full" disabled={readSingleMutation.isPending}>
                    <Check className="w-3.5 h-3.5"/>
                  </Button>)}
              </div>))) : (<div className="p-6 text-center text-xs text-muted-foreground">
              No new alerts
            </div>)}
        </div>
      </PopoverContent>
    </Popover>);
}
export function Layout({ children }) {
    const [location] = useLocation();
    const { user, logout } = useAuth();
    const navItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        ...(user?.role === "admin"
            ? [
                { name: "Classrooms", href: "/classrooms", icon: School },
                { name: "Supplies", href: "/supplies", icon: Archive },
                { name: "Stock", href: "/stock", icon: Layers },
                { name: "Out of Stock", href: "/out-of-stock", icon: PackageX },
                { name: "Low Stock", href: "/low-stock", icon: AlertTriangle },
                { name: "Usage Log", href: "/usage", icon: ClipboardList },
                { name: "Teachers", href: "/teachers", icon: Users },
                { name: "Reports", href: "/reports", icon: TrendingUp },
            ]
            : [
                { name: "My Classroom", href: `/classrooms/${user?.classroomId || 0}`, icon: School },
                { name: "Supplies Catalog", href: "/supplies", icon: Archive },
                { name: "Supply Requests", href: "/requests", icon: PackagePlus },
                { name: "Classroom Usage", href: "/usage", icon: ClipboardList },
            ]),
    ];
    const userInitials = user?.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : "U";
    return (<div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex flex-col justify-between md:min-h-screen">
        <div>
          <div className="p-6">
            <Link href="/" className="flex items-center gap-3 font-semibold text-xl text-sidebar-foreground tracking-tight">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
                <PackagePlus className="w-5 h-5"/>
              </div>
              Firstcry
            </Link>
          </div>
          
          <nav className="px-4 py-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
            const isActive = location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
            return (<Link key={item.name} href={item.href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap", isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                  <item.icon className="w-4 h-4"/>
                  {item.name}
                </Link>);
        })}
          </nav>
        </div>

        {/* Sidebar Profile Card & Logout */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10 flex flex-col gap-3 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize flex items-center gap-1 font-medium">
                {user?.role === "admin" ? (<ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0"/>) : (<School className="w-3.5 h-3.5 text-green-500 shrink-0"/>)}
                {user?.role}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()} className="w-full border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs h-8.5 font-medium">
            <LogOut className="w-3.5 h-3.5 mr-2"/>
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border px-6 md:px-10 shrink-0">
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">
            Classroom Supply Management System
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>);
}
