const fs = require('fs');
let code = fs.readFileSync('src/pages/MaintenanceOrders.tsx', 'utf8');

// When status changes to Finished/Completed in the UI... wait, how do they update the order?
