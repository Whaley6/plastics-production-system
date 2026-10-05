export const getCycleState = (diffDays: number, startState: string) => {
  const cycle = ['08:00 - 20:00', '20:00 - 08:00', 'OFF'];
  let startIndex = cycle.indexOf(startState);
  if (startIndex === -1) startIndex = 0;
  const index = ((startIndex + diffDays) % 3 + 3) % 3;
  return cycle[index];
};

export const getScheduleForDate = (
  workerId: string, 
  shift: string, 
  date: Date, 
  overrideSchedules: any, 
  patterns: any, 
  anchors: any,
  globalShiftOffset: number = 0
) => {
  const dateKey = date.toISOString().split('T')[0];
      
  // 1. One-off override
  if (overrideSchedules && overrideSchedules[workerId] && overrideSchedules[workerId][dateKey]) {
    return overrideSchedules[workerId][dateKey];
  }
      
  // 2. Special Pattern
  const pattern = patterns && patterns[workerId] ? patterns[workerId] : 'default';
  if (pattern !== 'default') {
    const dayOfWeek = date.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    if (pattern === 'fixed_morning') {
      return (dayOfWeek === 5) ? 'OFF' : '08:00 - 16:00';
    } else if (pattern === 'fixed_night') {
      return (dayOfWeek === 5) ? 'OFF' : '16:00 - 00:00';
    } else if (pattern === 'office') {
      return (dayOfWeek === 5 || dayOfWeek === 6) ? 'OFF' : '08:00 - 16:00';
    } else if (pattern.startsWith('custom_rotation_')) {
      const daysInPeriod = parseInt(pattern.replace('custom_rotation_', ''), 10) || 14;
      const currentEpoch = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const epoch = Date.UTC(2026, 6, 17); // Same epoch
      const diffDays = Math.floor((currentEpoch - epoch) / (1000 * 60 * 60 * 24));
      
      // Friday OFF
      if (dayOfWeek === 5) return 'OFF';
      
      const periodIndex = Math.floor(Math.abs(diffDays) / daysInPeriod);
      // Even period = Morning, Odd period = Night
      if (periodIndex % 2 === 0) {
        return '08:00 - 16:00';
      } else {
        return '16:00 - 00:00';
      }
    }
  }

  const currentEpoch = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  // 3. Cycle Anchor Override
  if (anchors && anchors[workerId]) {
    const anchor = anchors[workerId];
    const anchorDate = new Date(anchor.dateKey);
    const anchorEpoch = Date.UTC(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
        
    if (currentEpoch >= anchorEpoch) {
      const diffDays = Math.floor((currentEpoch - anchorEpoch) / (1000 * 60 * 60 * 24));
      return getCycleState(diffDays, anchor.state);
    }
  }

  // 4. Default Shift Cycle (Anchor: 2026-07-17)
  const epoch = Date.UTC(2026, 6, 17);
  const diffDays = Math.floor((currentEpoch - epoch) / (1000 * 60 * 60 * 24)) - globalShiftOffset;
  const patternDay = ((diffDays % 3) + 3) % 3;

  if (patternDay === 0) {
    if (shift === 'A') return 'OFF';
    if (shift === 'B') return '08:00 - 20:00';
    if (shift === 'C') return '20:00 - 08:00';
  } else if (patternDay === 1) {
    if (shift === 'A') return '08:00 - 20:00';
    if (shift === 'B') return '20:00 - 08:00';
    if (shift === 'C') return 'OFF';
  } else if (patternDay === 2) {
    if (shift === 'A') return '20:00 - 08:00';
    if (shift === 'B') return 'OFF';
    if (shift === 'C') return '08:00 - 20:00';
  }
  return 'OFF';
};

export const getCurrentShiftGroup = (globalShiftOffset: number = 0) => {
  const now = new Date();
  const hour = now.getHours();
  
  // A "shift day" starts at 08:00. So if it's 03:00 AM, we use yesterday's pattern day.
  const logicalDate = new Date(now);
  if (hour < 8) {
    logicalDate.setDate(logicalDate.getDate() - 1);
  }
  
  const currentEpoch = Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate());
  const epoch = Date.UTC(2026, 6, 17);
  const diffDays = Math.floor((currentEpoch - epoch) / (1000 * 60 * 60 * 24)) - globalShiftOffset;
  const patternDay = ((diffDays % 3) + 3) % 3;

  // Let's see who has what block
  let currentGroup = '';
  let nextGroup = '';
  let time = '';
  let nextTime = '';

  const getDaySchedule = (pDay: number, shiftName: string) => {
    if (pDay === 0) {
      if (shiftName === 'A') return 'OFF';
      if (shiftName === 'B') return '08:00 - 20:00';
      if (shiftName === 'C') return '20:00 - 08:00';
    } else if (pDay === 1) {
      if (shiftName === 'A') return '08:00 - 20:00';
      if (shiftName === 'B') return '20:00 - 08:00';
      if (shiftName === 'C') return 'OFF';
    } else if (pDay === 2) {
      if (shiftName === 'A') return '20:00 - 08:00';
      if (shiftName === 'B') return 'OFF';
      if (shiftName === 'C') return '08:00 - 20:00';
    }
  };

  const shifts = ['A', 'B', 'C'];
  
  let currentBlock = (hour >= 8 && hour < 20) ? '08:00 - 20:00' : '20:00 - 08:00';
  let nextBlock = (hour >= 8 && hour < 20) ? '20:00 - 08:00' : '08:00 - 20:00';
  
  currentGroup = shifts.find(s => getDaySchedule(patternDay, s) === currentBlock) || '';
  
  // Next group
  if (hour >= 8 && hour < 20) {
    // Next shift is 20:00-08:00 on the SAME logical day
    nextGroup = shifts.find(s => getDaySchedule(patternDay, s) === nextBlock) || '';
  } else {
    // Next shift is 08:00-20:00 on the NEXT logical day
    const nextPatternDay = (patternDay + 1) % 3;
    nextGroup = shifts.find(s => getDaySchedule(nextPatternDay, s) === nextBlock) || '';
  }

  return { current: currentGroup, next: nextGroup, time: currentBlock };
};

export const getActiveWorkersNow = (
  workers: any[],
  schedules: any,
  patterns: any,
  anchors: any,
  globalShiftOffset: number
) => {
  const now = new Date();
  const hour = now.getHours();
  const today = now;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return workers.filter(w => {
    if (w.status === 'Terminated') return false;
    const todaySched = getScheduleForDate(w.id, w.shift, today, schedules, patterns, anchors, globalShiftOffset);
    
    let isWorking = false;
    let logicalWorkingDateStr = '';
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (todaySched === '08:00 - 20:00' && hour >= 8 && hour < 20) { isWorking = true; logicalWorkingDateStr = todayStr; }
    if (todaySched === '08:00 - 16:00' && hour >= 8 && hour < 16) { isWorking = true; logicalWorkingDateStr = todayStr; }
    if (todaySched === '16:00 - 00:00' && hour >= 16 && hour <= 23) { isWorking = true; logicalWorkingDateStr = todayStr; }
    if (todaySched === '20:00 - 08:00' && hour >= 20) { isWorking = true; logicalWorkingDateStr = todayStr; }

    const yesterdaySched = getScheduleForDate(w.id, w.shift, yesterday, schedules, patterns, anchors, globalShiftOffset);
    if (yesterdaySched === '20:00 - 08:00' && hour < 8) { isWorking = true; logicalWorkingDateStr = yesterdayStr; }

    // Check for absence
    if (isWorking && w.actionHistory) {
      const hasAbsence = w.actionHistory.some((a: any) => a.type === 'Absence' && (a.date === logicalWorkingDateStr || a.date === todayStr));
      if (hasAbsence) return false;
    }

    return isWorking;
  });
};
