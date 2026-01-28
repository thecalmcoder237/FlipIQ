
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap = {
    'deal-input': 'Input Deal',
    'deal-analysis': 'Analysis',
    'report': 'Report',
    'deal-history': 'History',
    'deal-comparison': 'Comparison',
    'portfolio-dashboard': 'Portfolio',
  };

  return (
    <nav className="flex items-center text-sm text-gray-400 mb-6">
      <Link to="/" className="hover:text-gold-400 transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[name] || name;

        return (
          <div key={name} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-2" />
            {isLast ? (
              <span className="text-white font-medium">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:text-gold-400 transition-colors">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
