import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { Money } from './Money';

describe('Money', () => {
  it('создаётся из строки и хранит валюту', () => {
    const m = Money.of('12345.678901', 'KZT');
    expect(m.amount.toNumber()).toBe(12345.678901);
    expect(m.currency).toBe('KZT');
  });
  it('создаётся из number и Decimal', () => {
    expect(Money.of(10, 'USD').amount.toNumber()).toBe(10);
    expect(Money.of(new Decimal('0.1'), 'USD').amount.toNumber()).toBe(0.1);
  });
  it('zero даёт 0 заданной валюты', () => {
    const z = Money.zero('USD');
    expect(z.isZero()).toBe(true);
    expect(z.currency).toBe('USD');
  });
  it('plus складывает', () => {
    expect(Money.of('10.10', 'USD').plus(Money.of('20.20', 'USD')).toString()).toBe('30.3');
  });
  it('minus вычитает', () => {
    expect(Money.of('10.50', 'USD').minus(Money.of('0.25', 'USD')).toString()).toBe('10.25');
  });
  it('times умножает на множитель (строка, число, Decimal)', () => {
    const base = Money.of('3', 'USD');
    expect(base.times('2.5').toString()).toBe('7.5');
    expect(base.times(3).toString()).toBe('9');
    expect(base.times(new Decimal('0.5')).toString()).toBe('1.5');
  });
  it('negate меняет знак', () => {
    expect(Money.of('5', 'USD').negate().toString()).toBe('-5');
    expect(Money.of('-5', 'USD').negate().toString()).toBe('5');
  });
  it('бросает ошибку при разных валютах', () => {
    expect(() => Money.of('1', 'USD').plus(Money.of('1', 'KZT'))).toThrow('USD и KZT');
    expect(() => Money.of('1', 'USD').minus(Money.of('1', 'KZT'))).toThrow('USD и KZT');
  });
  it('toString не использует экспоненту', () => {
    expect(Money.of('0.000000000001', 'BTC').toString()).toBe('0.000000000001');
  });
  it('отрицательные и нулевые суммы помечаются флагами', () => {
    expect(Money.of('-1', 'USD').isNegative()).toBe(true);
    expect(Money.of('0', 'USD').isNegative()).toBe(false);
  });
});
