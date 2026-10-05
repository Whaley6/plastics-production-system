const fs = require('fs');
const file = 'src/pages/ProductionOrders.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const changeQueueSequence = \([\s\S]*?logAction.*?;[\s\n]*\}/;
const replacement = `const changeQueueSequence = (orderId: string, direction: 'left' | 'right') => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    
    const mName = targetOrder.assignedMachine;
    const sameMachPlanned = orders.filter(o => o.assignedMachine === mName && o.status === 'Planned');
    
    sameMachPlanned.sort((a,b) => {
      const timeA = new Date(a.startDate || 0).getTime();
      const timeB = new Date(b.startDate || 0).getTime();
      return timeA - timeB;
    });
    
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
      let targetTime = new Date(targetOrder.startDate || Date.now()).getTime();
      let swapTime = new Date(swapOrder.startDate || Date.now()).getTime();
      
      // If dates are exactly the same or very close, we need to artificially separate them
      if (Math.abs(targetTime - swapTime) < 1000) {
          if (direction === 'left') {
              // Target is moving left (needs to be earlier)
              // Currently target is at higher index. 
              // We want target to be earlier than swap.
              targetTime = swapTime - 60000;
          } else {
              // Target is moving right (needs to be later)
              // Currently target is at lower index.
              // We want target to be later than swap.
              targetTime = swapTime + 60000;
          }
      } else {
          // Normal swap of times
          const temp = targetTime;
          targetTime = swapTime;
          swapTime = temp;
      }
      
      setOrders(prev => prev.map(o => {
        if (o.id === targetOrder.id) return { ...o, startDate: new Date(targetTime).toISOString() };
        if (o.id === swapOrder.id) return { ...o, startDate: new Date(swapTime).toISOString() };
        return o;
      }));
      logAction('Queue Swapped', \`Swapped timeline sequence of \${targetOrder.itemName} and \${swapOrder.itemName}\`, 'info');
    }
  }`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Patched reorder');
