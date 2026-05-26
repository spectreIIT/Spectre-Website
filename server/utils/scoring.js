/**
 * Calculates decayed challenge points based on solve count and configuration.
 * 
 * @param {Object} challenge - Challenge document or configuration containing scoring parameters
 * @param {number} solveCount - Total solves including the current one
 * @returns {number} Decayed points
 */
export const calculateDecayPoints = (challenge, solveCount) => {
  const { scoringType, initialPoints, minimumPoints, decayFactor, decayType } = challenge;
  
  if (scoringType !== 'dynamic') {
    return challenge.points || initialPoints;
  }
  
  const init = Number(initialPoints) || 100;
  const min = Number(minimumPoints) || 50;
  const factor = Number(decayFactor) || 5;
  
  let points = init;
  
  if (decayType === 'linear') {
    points = init - (solveCount * factor);
  } else if (decayType === 'logarithmic') {
    // Formula: Round(initialPoints - (initialPoints - minimumPoints) * ln(1 + solveCount * factor) / ln(100))
    const numerator = Math.log(1 + solveCount * factor);
    const denominator = Math.log(100);
    points = Math.round(init - (init - min) * (numerator / denominator));
  } else if (decayType === 'exponential') {
    // Formula: Round(minimumPoints + (initialPoints - minimumPoints) * e^(-solveCount / factor))
    points = Math.round(min + (init - min) * Math.exp(-solveCount / factor));
  }
  
  return Math.max(min, points);
};
