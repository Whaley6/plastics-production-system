const fs = require('fs');
let code = fs.readFileSync('src/components/WorkerScheduleAndKPI.tsx', 'utf8');

const target1 = "export function WorkerScheduleAndKPI({ workers }: { workers: any[] }) {";
const replacement1 = "export function WorkerScheduleAndKPI({ workers, isReadOnly }: { workers: any[], isReadOnly?: boolean }) {";
code = code.replace(target1, replacement1);

const target2 = `            {!isEditing && (
              <button 
                onClick={handleExportSchedule}`;
const replacement2 = `            {!isEditing && !isReadOnly && (
              <button 
                onClick={() => {
                  setTempSchedules(customSchedules);
                  setTempPatterns(customPatterns);
                  setTempAnchors(customAnchors);
                  setIsEditing(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Schedule
              </button>
            )}
            {!isEditing && (
              <button 
                onClick={handleExportSchedule}`;
if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
} else {
  console.log("Could not find target2");
}

// Ensure the Edit button itself is hidden if there is an existing one. Wait, let's see where the original Edit button is.
