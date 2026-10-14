import type { DynamicLocationAnalysis } from '../analysis/locationAnalysis';
import type { AIInsight } from '../api/types';

/**
 * REGEN explanation layer.
 *
 * This is intentionally rule-based: it converts already-computed, structured
 * analysis into plain-language insights. It NEVER invents statistics, projects,
 * distances, population or financial returns — it only restates and interprets
 * values that were measured or computed upstream. Each insight declares the
 * kind of data it rests on (`basis`).
 *
 * To plug in a real LLM later, keep this contract: pass the structured analysis
 * as context and instruct the model to explain — not generate — numbers.
 */
export function explainLocation(analysis: DynamicLocationAnalysis): AIInsight[] {
  const basis = analysis.degraded ? 'fallback' : 'estimated';
  const insights: AIInsight[] = [];
  const name = analysis.location.name;
  const km = (analysis.radius / 1000).toFixed(0);

  const health = analysis.facilities.find((f) => f.category === 'healthcare');
  const edu = analysis.facilities.find((f) => f.category === 'education');
  const transport = analysis.facilities.find((f) => f.category === 'transport');
  const commercial =
    (analysis.facilities.find((f) => f.category === 'retail')?.count ?? 0) +
    (analysis.facilities.find((f) => f.category === 'food')?.count ?? 0);

  if (transport && transport.count > 0) {
    insights.push({
      title: transport.count >= 4 ? 'Well Connected' : 'Moderate Connectivity',
      body: `${transport.count} transport node${transport.count === 1 ? '' : 's'} found within ${km} km of ${name}${
        transport.nearestKm != null ? `, nearest ~${transport.nearestKm} km away` : ''
      }.`,
      tone: transport.count >= 4 ? 'good' : 'info',
      basis,
    });
  }

  if (health) {
    insights.push({
      title: health.count >= 4 ? 'Good Healthcare Access' : 'Limited Healthcare Access',
      body:
        health.count > 0
          ? `${health.count} healthcare facilities detected nearby. This supports residential and care-oriented uses.`
          : `No healthcare facilities detected within ${km} km — a potential service gap.`,
      tone: health.count >= 4 ? 'good' : health.count === 0 ? 'warn' : 'info',
      basis,
    });
  }

  if (commercial >= 10) {
    insights.push({
      title: 'Active Commercial Environment',
      body: `${commercial} retail and food/hospitality venues nearby indicate an established commercial area.`,
      tone: 'good',
      basis,
    });
  } else {
    insights.push({
      title: 'Emerging Commercial Activity',
      body: `${commercial} commercial venues detected — commercial density is still developing.`,
      tone: 'info',
      basis,
    });
  }

  if (edu && edu.count === 0) {
    insights.push({
      title: 'Education Gap',
      body: `No education facilities detected within ${km} km — worth investigating for family-oriented development.`,
      tone: 'warn',
      basis,
    });
  }

  if (analysis.degraded) {
    insights.push({
      title: 'Using Fallback Data',
      body: 'Live geographic data was unavailable for this area, so example data is shown. Figures should not be treated as verified.',
      tone: 'warn',
      basis: 'fallback',
    });
  }

  return insights;
}

/** Answer specific decision questions from structured analysis only. */
export function answerLocationQuestion(
  analysis: DynamicLocationAnalysis,
  question: 'why' | 'constraints' | 'infrastructure' | 'investigate',
): string {
  const health = analysis.facilities.find((f) => f.category === 'healthcare')?.count ?? 0;
  const transport = analysis.facilities.find((f) => f.category === 'transport')?.count ?? 0;
  const commercial =
    (analysis.facilities.find((f) => f.category === 'retail')?.count ?? 0) +
    (analysis.facilities.find((f) => f.category === 'food')?.count ?? 0);
  const label = analysis.degraded ? ' (based on fallback data)' : ' (estimated from live map data)';

  switch (question) {
    case 'why':
      return `${analysis.location.name} scores ${analysis.overallScore}/100 overall${label}, driven by ${transport} transport nodes and ${commercial} commercial venues nearby.`;
    case 'constraints':
      return health === 0
        ? `Healthcare coverage appears limited in this area${label}. Confirm with local sources before relying on it.`
        : `No major structural constraints detected from available data${label}. Field verification is still recommended.`;
    case 'infrastructure':
      return `${transport} transport nodes and ${analysis.facilities.find((f) => f.category === 'government')?.count ?? 0} public services detected nearby${label}.`;
    case 'investigate':
      return `Recommended next checks: land/zoning records, verified development plans from local authorities, and on-site accessibility — none of which are asserted here.`;
  }
}
