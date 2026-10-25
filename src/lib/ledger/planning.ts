/** Variable entries consume the estimate; they are never added on top of it. */
export function monthlyPlan(income: number, fixed: number, variable: number, estimate: number | null) {
  const cents = (value: number) => Math.round(value * 100);
  const variableCents = cents(variable);
  const plannedVariable = estimate === null ? variableCents : Math.max(variableCents, cents(estimate));
  return {
    variable: plannedVariable / 100,
    unrecordedEstimate: Math.max(0, plannedVariable - variableCents) / 100,
    remaining: (cents(income) - cents(fixed) - plannedVariable) / 100,
  };
}
