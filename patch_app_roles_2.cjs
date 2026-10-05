const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  // Default to a permitted page if they don't have access
  useEffect(() => {
    if (user && currentRole && currentPage !== 'account' && currentPage !== 'settings' && currentPage !== 'roles') {
      if (!(currentRole.permissions as any)[currentPage]) {
        const firstPermitted = ['workers', 'maintenance', 'cnc', 'auxiliary', 'production', 'complaints', 'machines', 'archive'].find(p => (currentRole.permissions as any)[p]);
        if (firstPermitted) setCurrentPage(firstPermitted as Page);
      }
    }
  }, [currentRole, currentPage, user, setCurrentPage]);`;

const replacement = `  // Default to a permitted page if they don't have access
  useEffect(() => {
    if (user && currentRole && currentPage !== 'account') {
      let hasAccess = false;
      if (currentPage === 'settings' || currentPage === 'roles') {
        hasAccess = currentRole.permissions.settings !== false;
      } else {
        hasAccess = (currentRole.permissions as any)[currentPage] !== false;
      }
      
      if (!hasAccess) {
        const firstPermitted = ['workers', 'maintenance', 'cnc', 'auxiliary', 'production', 'complaints', 'machines', 'archive'].find(p => (currentRole.permissions as any)[p] !== false);
        if (firstPermitted) setCurrentPage(firstPermitted as Page);
        else setCurrentPage('account');
      }
    }
  }, [currentRole, currentPage, user, setCurrentPage]);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("Could not find target to replace in App.tsx");
}
