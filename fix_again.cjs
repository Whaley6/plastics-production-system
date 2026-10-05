const fs = require('fs');
let content = fs.readFileSync('src/pages/CncMoldTickets.tsx', 'utf-8');

content = content.replace(
  "ticke(t.state !== 'Fixed Properly' && t.state !== 'Works (Not Fixed)')",
  "(ticket.state !== 'Fixed Properly' && ticket.state !== 'Works (Not Fixed)')"
);

content = content.replace(
  "lightboxTicke(t.state === 'Fixed Properly' || t.state === 'Works (Not Fixed)')",
  "(lightboxTicket.state === 'Fixed Properly' || lightboxTicket.state === 'Works (Not Fixed)')"
);

fs.writeFileSync('src/pages/CncMoldTickets.tsx', content);
