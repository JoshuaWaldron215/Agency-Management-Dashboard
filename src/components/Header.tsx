import { Menu, User, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useUserRole } from "@/contexts/UserRoleContext";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/performance", label: "Calculator" },
  { path: "/sheets", label: "Sheets" },
  { path: "/leaderboard", label: "Leaderboard" },
];

const adminNavItems = [
  { path: "/models", label: "Models" },
  { path: "/team-members", label: "Team" },
];

export function Header() {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isAdmin } = useUserRole();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const estTime = toZonedTime(currentTime, "America/New_York");

  return (
    <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-background border-border">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Main navigation menu for MAP MGT</SheetDescription>
              <div className="flex items-center gap-2 mb-8">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">MAP MGT</span>
              </div>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2.5 rounded-lg transition-all duration-75 text-sm font-medium ${
                      location.pathname === item.path
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </Link>
                ))}
                {isAdmin && (
                  <>
                    <div className="border-t border-border my-3" />
                    <span className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Admin
                    </span>
                    {adminNavItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`px-4 py-2.5 rounded-lg transition-all duration-75 text-sm font-medium ${
                          location.pathname === item.path
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2.5" data-testid="link-logo">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:block">MAP MGT</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} data-testid={`nav-${item.label.toLowerCase()}`}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  size="sm"
                  className="text-sm"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="w-px h-5 bg-border mx-1" />
                {adminNavItems.map((item) => (
                  <Link key={item.path} to={item.path} data-testid={`nav-${item.label.toLowerCase()}`}>
                    <Button
                      variant={location.pathname === item.path ? "default" : "ghost"}
                      size="sm"
                      className="text-sm"
                    >
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/50">
            <div className="pulse-dot" />
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {format(estTime, "h:mm a")} ET
            </span>
          </div>
          
          <Link to="/profile" data-testid="link-profile">
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary transition-all duration-75">
              <AvatarFallback className="bg-secondary text-foreground text-sm">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
