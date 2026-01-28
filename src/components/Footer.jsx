
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-gray-900 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            © {currentYear} FlipIQ powered by PAVEL REI. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Real Estate Deal Analysis Platform
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
