export const buildHeatmapMonths = (weeks) => {
  const months = [];
  let currentMonth = -1;
  let lastPushedIndex = -10;
  
  weeks.forEach((week, index) => {
    if (week.length > 0) {
      const date = new Date(week[0].date);
      if (date.getUTCMonth() !== currentMonth) {
        const monthName = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
        if (index - lastPushedIndex >= 3) {
          months.push({ name: monthName, index });
          lastPushedIndex = index;
        } else if (lastPushedIndex === 0 && index < 3) {
          months[months.length - 1] = { name: monthName, index };
          lastPushedIndex = index;
        }
        currentMonth = date.getUTCMonth();
      }
    }
  });

  return months;
};
