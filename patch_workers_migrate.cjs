const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

const target = "const [workers, setWorkers] = useLocalStorage('workers_data', INITIAL_WORKERS);";
const replacement = `const [workers, setWorkers] = useLocalStorage('workers_data', INITIAL_WORKERS);

  React.useEffect(() => {
    // Migration: fix old english titles
    if (workers && workers.length > 0) {
      const needsMigration = workers.some((w: any) => 
        w.jobTitle === 'Forklift Operator' || 
        w.jobTitle === 'QA Inspector' || 
        w.jobTitle === 'Machine Operator' || 
        w.jobTitle === 'Packager'
      );
      if (needsMigration) {
        const migrated = workers.map((w: any) => {
          if (w.jobTitle === 'Forklift Operator') return { ...w, jobTitle: 'مشغل' };
          if (w.jobTitle === 'QA Inspector') return { ...w, jobTitle: 'موظف جودة' };
          if (w.jobTitle === 'Machine Operator') return { ...w, jobTitle: 'مشغل' };
          if (w.jobTitle === 'Packager') return { ...w, jobTitle: 'عامل تعبئة و تغليف' };
          return w;
        });
        setWorkers(migrated);
      }
    }
  }, [workers, setWorkers]);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
} else {
  console.log("Could not find target to replace.");
}
