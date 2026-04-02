import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  CreditCard,
  MapPin,
  Languages,
  LogOut,
  Brain,
  ChevronRight,
  Stethoscope,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileDropdownProps {
  expanded?: boolean;
  onOpenChange?: (open: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan: "Free" | "Plus" | "Pro";
  };
}

export function ProfileDropdown({
  expanded = false,
  onOpenChange,
  user = {
    name: "User",
    email: "user@example.com",
    plan: "Free",
  },
}: ProfileDropdownProps) {
  const navigate = useNavigate();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const planColor = {
    Free: "bg-muted text-muted-foreground",
    Plus: "bg-blue-500/15 text-blue-500",
    Pro:  "bg-primary/15 text-primary",
  }[user.plan];

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-10 transition-all duration-200 hover:bg-sidebar-accent/50",
            expanded
              ? "w-full justify-start gap-3 px-3 rounded-xl"
              : "w-10 p-0 rounded-xl"
          )}
        >
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/20">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {expanded && (
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
                {user.email}
              </p>
            </div>
          )}
          {expanded && (
            <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 flex-shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 bg-popover border-border shadow-xl shadow-black/10 rounded-2xl p-1"
        side="top"
        align="start"
        sideOffset={8}
        forceMount
      >
        {/* User info header */}
        <DropdownMenuLabel className="font-normal px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <Badge className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold border-0", planColor)}>
                  {user.plan}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1" />

        {/* Account section */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate("/auth")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Profile</span>
              <span className="text-[11px] text-muted-foreground">Manage your account</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/chat")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Settings className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Settings</span>
              <span className="text-[11px] text-muted-foreground">Preferences & privacy</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/chat")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Languages className="h-3.5 w-3.5 text-green-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Language</span>
              <span className="text-[11px] text-muted-foreground">Change display language</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/find-doctor")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Location</span>
              <span className="text-[11px] text-muted-foreground">Find doctors near you</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1" />

        {/* Quick links */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/overview")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Dashboard</span>
              <span className="text-[11px] text-muted-foreground">Health overview & analytics</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/find-doctor")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-3.5 w-3.5 text-teal-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Find a Doctor</span>
              <span className="text-[11px] text-muted-foreground">Connect with specialists</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/chat")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
              <Brain className="h-3.5 w-3.5 text-pink-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Memory Settings</span>
              <span className="text-[11px] text-muted-foreground">AI memory preferences</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/auth")}
            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
          >
            <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-3.5 w-3.5 text-yellow-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Subscription</span>
              <span className="text-[11px] text-muted-foreground">
                {user.plan === "Free" ? "Upgrade to Pro" : "Manage plan"}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1" />

        {/* Log out */}
        <DropdownMenuItem
          onClick={() => navigate("/")}
          className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <LogOut className="h-3.5 w-3.5 text-destructive" />
          </div>
          <span className="text-sm font-medium">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}