const fs = require('fs');
let content = fs.readFileSync('src/pages/WorkerKPIs.tsx', 'utf-8');

content = content.replace(
  /rankClass: !hasScoresForCurrentQuarter \? 'N\/A' : currentScore >= 90 \? 'A' : currentScore >= 80 \? 'B' : currentScore >= 70 \? 'C' : 'D'/,
  "rankClass: !hasScoresForCurrentQuarter ? 'N/A' : currentScore >= 91 ? 'A' : currentScore >= 81 ? 'B' : currentScore >= 71 ? 'C' : currentScore >= 60 ? 'D' : 'F'"
);

content = content.replace(
  /\} else if \(rankFilter === 'D'\) \{\s*if \(w\.rankClass !== 'D'\) return false;\s*\}/,
  "} else if (rankFilter === 'D') {\n          if (w.rankClass !== 'D') return false;\n        } else if (rankFilter === 'F') {\n          if (w.rankClass !== 'F') return false;\n        }"
);

content = content.replace(
  /<option value="D">Rank D<\/option>/,
  '<option value="D">Rank D</option>\n                <option value="F">Rank F</option>'
);

content = content.replace(
  /worker\.rankClass === 'C' \? 'bg-amber-500' :\s*worker\.rankClass === 'N\/A' \? 'bg-surface-elevated text-secondary border border-divider' : 'bg-red-500'/,
  "worker.rankClass === 'C' ? 'bg-amber-500' :\n                        worker.rankClass === 'D' ? 'bg-orange-500' :\n                        worker.rankClass === 'N/A' ? 'bg-surface-elevated text-secondary border border-divider' : 'bg-red-500'"
);

fs.writeFileSync('src/pages/WorkerKPIs.tsx', content);
