
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background text-foreground border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            © {currentYear} FlipIQ powered by PAVEL REI. All rights reserved.
          </p>
          <p className="text-muted-foreground/80 text-xs mt-2">
            Real Estate Deal Analysis Platform
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
