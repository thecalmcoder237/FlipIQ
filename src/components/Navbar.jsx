
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Home, TrendingUp, History, PieChart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import QuickAccessSidebar from './QuickAccessSidebar';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (['/login', '/signup'].includes(location.pathname)) return null;

  return (
    <>
      <QuickAccessSidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border' : 'bg-background/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 pl-10 lg:pl-0"> 
            {/* Added padding-left for mobile sidebar toggle space */}
            
            <Link to="/deal-input" className="flex items-center space-x-3 group">
              <img 
                src="/assets/flipiq-logo.png" 
                alt="FlipIQ Logo" 
                className="h-10 w-auto group-hover:scale-105 transition-transform"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <div className="bg-gradient-to-br from-primary to-accentBrand p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform hidden">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-foreground tracking-tight">FlipIQ</h1>
                <p className="text-xs text-muted-foreground -mt-1">powered by PAVEL REI</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            {currentUser && (
              <div className="hidden lg:flex items-center space-x-1">
                <NavLink to="/deal-input" icon={Home} label="New Deal" active={location.pathname === '/deal-input'} />
                <NavLink to="/deal-history" icon={History} label="History" active={location.pathname === '/deal-history'} />
                <NavLink to="/portfolio-dashboard" icon={PieChart} label="Portfolio" active={location.pathname === '/portfolio-dashboard'} />
                
                <div className="h-6 w-px bg-border mx-2" />
                
                <div className="flex items-center gap-3 ml-2">
                   <div className="text-right hidden xl:block">
                      <p className="text-sm font-bold text-foreground">{currentUser.email?.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground">Pro Member</p>
                   </div>
                   <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </Button>
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            {currentUser && (
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-foreground hover:bg-accent"
                >
                  {isOpen ? <X size={24} /> : <Menu size={24} />}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isOpen && currentUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-background border-t border-border overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2">
                <MobileNavLink to="/deal-input" icon={Home} label="New Deal" onClick={() => setIsOpen(false)} />
                <MobileNavLink to="/deal-history" icon={History} label="History" onClick={() => setIsOpen(false)} />
                <MobileNavLink to="/portfolio-dashboard" icon={PieChart} label="Portfolio" onClick={() => setIsOpen(false)} />
                <hr className="border-border my-2" />
                <button
                  onClick={() => { handleSignOut(); setIsOpen(false); }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 w-full transition-all"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

const NavLink = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
      active 
        ? 'bg-primary/10 text-primary' 
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`}
  >
    <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
    <span>{label}</span>
  </Link>
);

const MobileNavLink = ({ to, icon: Icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent transition-all"
  >
    <Icon size={20} />
    <span>{label}</span>
  </Link>
);

export default Navbar;
