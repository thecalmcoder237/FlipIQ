import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Brain, FileText, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate('/deal-input');
    }
    
    setIsLoading(false);
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Instant insights powered by advanced AI'
    },
    {
      icon: FileText,
      title: 'Professional Reports',
      description: 'Lender-ready documents in seconds'
    },
    {
      icon: Shield,
      title: 'Risk Assessment',
      description: 'Comprehensive scenario modeling'
    },
    {
      icon: Zap,
      title: 'Fast & Accurate',
      description: 'Real-time market data and comps'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Login - FlipIQ</title>
        <meta name="description" content="Sign in to FlipIQ - Real Estate Deal Analysis Platform powered by PAVEL REI" />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-muted via-background to-muted">
        {/* Header with logo */}
        <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm px-4 py-4 flex items-center justify-center shrink-0">
          <img
            src="/assets/flipiq-logo.png"
            alt="FlipIQ Logo"
            className="h-24 w-auto"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Value Propositions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:block space-y-8"
          >
            <div className="space-y-4">
              <img 
                src="/assets/flipiq-logo.png" 
                alt="FlipIQ Logo" 
                className="h-48 w-auto mb-4"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <h1 className="text-4xl font-bold text-foreground">
                Make Smarter Real Estate Investment Decisions
              </h1>
              <p className="text-lg text-muted-foreground">
                FlipIQ helps you analyze deals faster, assess risks accurately, and make confident investment choices.
              </p>
              <p className="text-sm text-muted-foreground/80 italic">
                powered by PAVEL REI
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Trusted by real estate investors nationwide</span>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
              {/* Logo and Title - Mobile/Tablet */}
              <div className="text-center mb-8 md:hidden">
                <img 
                  src="/assets/flipiq-logo.png" 
                  alt="FlipIQ Logo" 
                  className="h-36 w-auto mx-auto mb-4"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
                <p className="text-muted-foreground">Sign in to your account</p>
                <p className="text-xs text-muted-foreground/80 mt-1">powered by PAVEL REI</p>
              </div>

              {/* Desktop Title */}
              <div className="text-center mb-8 hidden md:block">
                <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
                <p className="text-muted-foreground">Sign in to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-muted border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-muted border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-accentBrand hover:from-primary/90 hover:to-accentBrand/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-primary hover:text-primary/90 font-semibold transition-colors">
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
