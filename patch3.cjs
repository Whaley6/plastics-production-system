const fs = require('fs');
const file = 'src/pages/ProductionOrders.tsx';
let content = fs.readFileSync(file, 'utf8');

const changeQueueSeqRegex = /const changeQueueSequence = \([\s\S]*?logAction.*?;[\s\n]*\}/;
const replacement = `const changeQueueSequence = (orderId: string, direction: 'left' | 'right') => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    
    const mName = targetOrder.assignedMachine;
    const sameMachPlanned = orders.filter(o => o.assignedMachine === mName && o.status === 'Planned');
    
    // Ensure all have distinct dates to avoid stable sort issues when swapping
    sameMachPlanned.forEach((o, idx) => {
       if (!o.startDate) o.startDate = new Date(Date.now() + idx * 1000).toISOString();
    });
    
    sameMachPlanned.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    const currentPlannedIdx = sameMachPlanned.findIndex(o => o.id === orderId);
    if (currentPlannedIdx === -1) return;

    let swapWithIdx = -1;
    if (direction === 'left' && currentPlannedIdx > 0) {
      swapWithIdx = currentPlannedIdx - 1;
    } else if (direction === 'right' && currentPlannedIdx < sameMachPlanned.length - 1) {
      swapWithIdx = currentPlannedIdx + 1;
    }

    if (swapWithIdx !== -1) {
      const swapOrder = sameMachPlanned[swapWithIdx];
      let targetDateStr = targetOrder.startDate;
      let swapDateStr = swapOrder.startDate;
      
      const targetTime = new Date(targetDateStr).getTime();
      const swapTime = new Date(swapDateStr).getTime();
      
      if (targetTime === swapTime) {
         if (direction === 'left') {
            targetDateStr = new Date(targetTime - 1000).toISOString();
            swapDateStr = new Date(swapTime + 1000).toISOString();
         } else {
            targetDateStr = new Date(targetTime + 1000).toISOString();
            swapDateStr = new Date(swapTime - 1000).toISOString();
         }
      }
      
      setOrders(prev => prev.map(o => {
        if (o.id === targetOrder.id) return { ...o, startDate: swapDateStr };
        if (o.id === swapOrder.id) return { ...o, startDate: targetDateStr };
        return o;
      }));
      logAction('Queue Swapped', \`Swapped timeline sequence of \${targetOrder.itemName} and \${swapOrder.itemName}\`, 'info');
    }
  }`;

content = content.replace(changeQueueSeqRegex, replacement);
fs.writeFileSync(file, content);
console.log('Patched changeQueueSequence');
