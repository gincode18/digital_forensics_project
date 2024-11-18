function calculateRiskLevel(riskIndicators) {
  if (!riskIndicators.length) return 'Low';
  const severityScores = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  
  const averageScore = riskIndicators.reduce((acc, indicator) => 
    acc + severityScores[indicator.severity.toLowerCase()], 0) / riskIndicators.length;
  
  if (averageScore <= 1.5) return 'Low';
  if (averageScore <= 2.5) return 'Medium';
  if (averageScore <= 3.5) return 'High';
  return 'Critical';
}

function getRiskColor(severity) {
  const colors = {
    'low': '#2ecc71',
    'medium': '#f1c40f',
    'high': '#e67e22',
    'critical': '#e74c3c'
  };
  return colors[severity.toLowerCase()] || '#333333';
}

module.exports = {
  calculateRiskLevel,
  getRiskColor
};