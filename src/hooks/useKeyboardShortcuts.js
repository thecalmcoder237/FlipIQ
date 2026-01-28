
import { useEffect } from 'react';

const useKeyboardShortcuts = (actions) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl or Cmd key
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 's':
            if (actions.save) {
              event.preventDefault();
              actions.save();
            }
            break;
          case 'n':
            if (actions.new) {
              event.preventDefault();
              actions.new();
            }
            break;
          case 'e':
            if (actions.edit) {
              event.preventDefault();
              actions.edit();
            }
            break;
          case 'r':
            if (actions.report) {
              event.preventDefault();
              actions.report();
            }
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};

export default useKeyboardShortcuts;
