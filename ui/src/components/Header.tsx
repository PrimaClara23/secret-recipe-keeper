import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, Home, BookOpen, PlusCircle, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccount } from 'wagmi';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/recipes', label: 'Recipes', icon: BookOpen },
  { path: '/create', label: 'Create', icon: PlusCircle },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/my-recipes', label: 'My Recipes', icon: User },
];

const Header = () => {
  const location = useLocation();
  const { isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border glass-effect">
      <div className="container flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <ChefHat className="h-8 w-8 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              Secret Recipe Keeper
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              FHE-Protected Culinary Secrets
            </p>
          </div>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  "hover:bg-muted/50",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {isConnected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Connected
            </motion.div>
          )}
          <ConnectButton />
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-t border-border">
        <div className="container flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

export default Header;
