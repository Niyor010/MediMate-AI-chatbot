import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScanFace } from "lucide-react";
import {
  Plus,
  MessageSquare,
  Menu,
  X,
  BarChart2,
  Activity,
  Newspaper,
  Bell,
  Heart,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDropdown } from "./ProfileDropdown";

interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  messages: any[];
}

interface SidebarProps {
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
}

// Nav item used in collapsed and expanded states
function NavItem({
  to,
  icon: Icon,
  label,
  expanded,
  external,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  expanded: boolean;
  external?: boolean;
}) {
  const location = useLocation();
  const isActive = !external && location.pathname === to;

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn(
          "flex-shrink-0 transition-colors duration-200",
          expanded ? "h-4 w-4" : "h-5 w-5",
          isActive
            ? "text-primary"
            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
        )}
      />
      {expanded && (
        <span className="truncate transition-all duration-200">{label}</span>
      )}
      {isActive && expanded && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}
    </div>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return (
    <NavLink to={to} className="block">
      {inner}
    </NavLink>
  );
}

export default function Sidebar({
  children,
  isCollapsed,
  onToggleCollapse,
  onNewChat,
  onOpenSettings,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}: SidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewChat();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onNewChat]);

  const navItems = [
    { to: "/health", icon: MessageSquare, label: "Health Dashboard" },
    { to: "/dashboard/overview", icon: BarChart2, label: "Overview" },
    { to: "/dashboard/analytics", icon: Activity, label: "Analytics" },
    { to: "/dashboard/news", icon: Newspaper, label: "News" },
    { to: "/skin-check", icon: ScanFace, label: "Skin Check" },
    {
      to: "https://www.data.gov.in/",
      icon: Bell,
      label: "Vaccination Alerts",
      external: true,
    },
  ];

  const sidebarContent = (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300 ease-in-out",
        "bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]",
        expanded || isMobile ? "w-80" : "w-20",
      )}
      onMouseEnter={() => {
        if (!isMobile) setExpanded(true);
      }}
      onMouseLeave={() => {
        if (!isMobile && !profileOpen) setExpanded(false);
      }}
    >
      {/* ── Logo / Brand ── */}
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-6 border-b border-[hsl(var(--sidebar-border))]",
          expanded || isMobile ? "justify-start" : "justify-center",
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        {(expanded || isMobile) && (
          <span className="font-bold text-xl text-sidebar-foreground tracking-tight">
            Medi<span className="text-primary">Mate</span>
          </span>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="ml-auto h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── New Chat Button ── */}
      <div
        className={cn(
          "px-3 py-4",
          expanded || isMobile ? "" : "flex justify-center",
        )}
      >
        <Button
          onClick={onNewChat}
          size="sm"
          className={cn(
            "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200",
            expanded || isMobile
              ? "w-full justify-start gap-2"
              : "w-10 h-10 p-0 rounded-xl",
          )}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          {(expanded || isMobile) && (
            <span className="text-sm font-medium">New Chat</span>
          )}
        </Button>
      </div>

      <Separator className="bg-[hsl(var(--sidebar-border))] mx-3 w-auto" />

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto py-3">
        {(expanded || isMobile) && (
          <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Navigation
          </p>
        )}
        <nav
          className={cn("space-y-0.5", expanded || isMobile ? "px-2" : "px-2")}
        >
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              expanded={expanded || isMobile}
              external={item.external}
            />
          ))}
        </nav>
      </div>

      <Separator className="bg-[hsl(var(--sidebar-border))] mx-3 w-auto" />

      {/* ── Bottom Controls ── */}
      <div
        className={cn(
          "py-3 flex flex-col gap-2",
          expanded || isMobile ? "px-2" : "px-2 items-center",
        )}
      >
        {/* Theme toggle */}
        <div
          className={cn(
            "flex items-center",
            expanded || isMobile ? "px-1" : "justify-center",
          )}
        >
          <ThemeToggle isHovering={expanded || isMobile} />
        </div>

        {/* Profile */}
        <div
          className={cn(
            "flex items-center",
            expanded || isMobile ? "px-1" : "justify-center",
          )}
        >
          <ProfileDropdown
            expanded={expanded || isMobile}
            onOpenChange={(open) => {
              setProfileOpen(open);
              if (open) setExpanded(true);
              else if (!isMobile) setExpanded(false);
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile hamburger */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-40 md:hidden bg-background/80 backdrop-blur-sm border shadow-lg h-9 w-9 p-0"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Desktop sidebar — always visible */}
      {!isMobile && (
        <div className="flex-shrink-0 h-full z-20 relative">
          {sidebarContent}
        </div>
      )}

      {/* Mobile sidebar — slide in */}
      {isMobile && (
        <>
          {isOpen && (
            <div
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-30"
              onClick={() => setIsOpen(false)}
            />
          )}
          <div
            className={cn(
              "fixed top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out",
              isOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            {sidebarContent}
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
