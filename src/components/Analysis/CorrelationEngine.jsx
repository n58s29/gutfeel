import { useMemo } from "react";
import { analyzeCorrelations } from "../../lib/correlation.js";

/**
 * Headless wrapper that runs the correlation analysis and passes results to children.
 * Props:
 *   entries       — all journal entries
 *   lookbackHours — default 24
 *   filterSymptom — optional symptom key to restrict analysis
 *   children      — render prop: (result) => ReactNode
 *                   result = { ingredients, symptomCount, mealCount, symptomBreakdown }
 */
export default function CorrelationEngine({ entries, lookbackHours = 24, filterSymptom = null, children }) {
  const result = useMemo(
    () => analyzeCorrelations(entries, { lookbackHours, filterSymptom }),
    [entries, lookbackHours, filterSymptom]
  );

  return children(result);
}
