function generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.profileMetrics.engagementRate < 1) {
    recommendations.push('Consider increasing engagement with followers through more interactive content');
  }
  
  if (analysis.contentAnalysis.overallSentiment.score < 0) {
    recommendations.push('Monitor content tone to maintain a more balanced sentiment profile');
  }
  
  // Add more recommendations based on analysis
  if (analysis.riskIndicators.length > 0) {
    recommendations.push('Review and address identified risk factors to improve account security');
  }
  
  return recommendations;
}

module.exports = {
  generateRecommendations
};