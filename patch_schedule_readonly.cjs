const fs = require('fs');
let code = fs.readFileSync('src/components/WorkerScheduleAndKPI.tsx', 'utf8');

const target = `            ) : (
              <button 
                onClick={handleStartEdit}
                className="px-4 py-2 text-sm font-medium text-blue-500 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Schedule
              </button>
            )}`;

const replacement = `            ) : !isReadOnly ? (
              <button 
                onClick={handleStartEdit}
                className="px-4 py-2 text-sm font-medium text-blue-500 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Schedule
              </button>
            ) : null}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/WorkerScheduleAndKPI.tsx', code);
  console.log("Success");
} else {
  console.log("Failed to find target");
}
