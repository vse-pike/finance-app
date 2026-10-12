import Decimal from 'decimal.js';
Decimal.set({ precision: 38, toExpNeg: -30, toExpPos: 40 });

export class Money {
  private constructor(
    public readonly amount: Decimal,
    public readonly currency: string,
  ) {}
  static of(amount: Decimal | string | number, currency: string): Money {
    const d = new Decimal(amount);
    if (!d.isFinite()) {
      throw new Error(`Некорректная сумма: ${String(amount)}`);
    }
    return new Money(d, currency);
  }
  static zero(currency: string): Money {
    return new Money(new Decimal(0), currency);
  }
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Операция над разными валютами: ${this.currency} и ${other.currency}`,
      );
    }
  }
  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }
  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }
  times(factor: Decimal | string | number): Money {
    return new Money(this.amount.mul(factor), this.currency);
  }
  negate(): Money {
    return new Money(this.amount.negated(), this.currency);
  }
  isZero(): boolean {
    return this.amount.isZero();
  }
  isNegative(): boolean {
    return this.amount.isNegative();
  }
  toString(): string {
    return this.amount.toFixed();
  }
}
