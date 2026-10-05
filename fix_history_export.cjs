const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

const oldActionHistoryExport = "ActionHistory: w.actionHistory ? JSON.stringify(w.actionHistory) : '[]'";
const newActionHistoryExport = "ActionHistory: (w.actionHistory && w.actionHistory.length > 0) ? w.actionHistory.map((a: any) => `[${a.date || ''}] ${a.type || ''}: ${a.reason || ''}`).join('\\n') : ''";

code = code.replace(oldActionHistoryExport, newActionHistoryExport);


const oldActionHistoryImport = "try { if (row.ActionHistory && String(row.ActionHistory).trim() !== '') actionHistory = JSON.parse(String(row.ActionHistory)); } catch(e){}";
const newActionHistoryImport = `              try { 
                if (row.ActionHistory && String(row.ActionHistory).trim() !== '') {
                  const val = String(row.ActionHistory);
                  if (val.trim().startsWith('[')) {
                    try {
                      actionHistory = JSON.parse(val);
                    } catch (parseError) {
                      actionHistory = val.split('\\n').map(line => {
                        const match = line.match(/^\\[(.*?)\\] (.*?): (.*)$/);
                        if (match) return { date: match[1], type: match[2], reason: match[3] };
                        return { date: new Date().toISOString().split('T')[0], type: 'System Note', reason: line };
                      });
                    }
                  } else {
                    actionHistory = val.split('\\n').map(line => {
                      const match = line.match(/^\\[(.*?)\\] (.*?): (.*)$/);
                      if (match) {
                        return { date: match[1], type: match[2], reason: match[3] };
                      }
                      return { date: new Date().toISOString().split('T')[0], type: 'System Note', reason: line };
                    });
                  }
                }
              } catch(e) {}`;

code = code.replace(oldActionHistoryImport, newActionHistoryImport);

fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
