export class ProviderLimitError extends Error {
  constructor() {
    super("Provider allowance unavailable");
    this.name = "ProviderLimitError";
  }
}
export class ProviderOutputError extends Error {
  constructor() {
    super("Invalid provider output");
    this.name = "ProviderOutputError";
  }
}
