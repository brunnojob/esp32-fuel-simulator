export const PRICE_CENTS = 655;
export const PULSES_PER_LITRE = 450;
export function plan({ mode, amount, capacity, initial }) {
  if (![amount, capacity, initial].every(Number.isFinite) || amount <= 0 || capacity <= 0 || capacity > 200 || initial < 0 || initial > capacity || !['money', 'litres', 'full'].includes(mode)) throw new Error('Confira os valores: capacidade de 1 a 200 L e nível inicial dentro do tanque.');
  const available = Math.max(0, Math.round((capacity - initial) * 1000));
  const requested = mode === 'full' ? available : mode === 'money' ? Math.floor(Math.round(amount * 100) * 1000 / PRICE_CENTS) : Math.round(amount * 1000);
  const targetMl = Math.min(available, requested);
  if (targetMl < 1) throw new Error('O tanque está cheio ou a quantidade é menor que 1 mL.');
  return { targetMl, capacityMl: Math.round(capacity * 1000), initialMl: Math.round(initial * 1000), limited: requested > available, mode };
}
export function advance(session, seconds, rate) {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(rate) || rate <= 0) throw new Error('Tempo ou vazão inválidos.');
  const ml = Math.min(session.targetMl, session.ml + rate * 1000 / 60 * seconds);
  return { ...session, ml, elapsed: session.elapsed + (ml - session.ml) / (rate * 1000 / 60), status: ml >= session.targetMl ? 'complete' : 'running' };
}
export const cost = ml => Math.round(ml * PRICE_CENTS / 1000);
export const pulses = ml => Math.floor(ml * PULSES_PER_LITRE / 1000);
