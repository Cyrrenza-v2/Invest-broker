import { describe, expect, it } from "vitest";
import { simulateTrade, simulateTransfer, type SandboxState } from "../src/sandbox-wallet";

function state(): SandboxState {
  return { usd: 1000, coins: { BTC: 0.1, ETH: 2, USDT: 100 }, activity: [] };
}

describe("browser sandbox wallet model", () => {
  it("buys a demo asset and records simulated activity", () => {
    const result = simulateTrade(state(), "buy", "ETH", 0.1);
    expect(result.error).toBeUndefined();
    expect(result.state.usd).toBe(648);
    expect(result.state.coins.ETH).toBeCloseTo(2.1);
    expect(result.state.activity[0]).toMatchObject({ type: "Simulated buy", asset: "ETH", status: "simulated" });
  });

  it("rejects a buy that exceeds the simulated USD balance without changing it", () => {
    const before = state();
    const result = simulateTrade(before, "buy", "BTC", 1);
    expect(result.error).toContain("Not enough simulated USD");
    expect(result.state.usd).toBe(1000);
    expect(result.state.coins.BTC).toBe(0.1);
    expect(result.state.activity).toHaveLength(0);
  });

  it("sells a demo asset and credits only the local simulated USD balance", () => {
    const result = simulateTrade(state(), "sell", "BTC", 0.05);
    expect(result.error).toBeUndefined();
    expect(result.state.usd).toBe(4362);
    expect(result.state.coins.BTC).toBeCloseTo(0.05);
    expect(result.state.activity[0].status).toBe("simulated");
  });

  it("rejects a sale above the demo coin balance", () => {
    const result = simulateTrade(state(), "sell", "BTC", 2);
    expect(result.error).toContain("Not enough simulated BTC");
    expect(result.state.usd).toBe(1000);
  });

  it("records a simulated transfer and reduces only the local demo balance", () => {
    const result = simulateTransfer(state(), "ETH", 0.5, "demo-recipient@example.test");
    expect(result.error).toBeUndefined();
    expect(result.state.coins.ETH).toBe(1.5);
    expect(result.state.activity[0]).toMatchObject({ type: "Simulated transfer", status: "simulated", detail: expect.stringContaining("demo-recipient@example.test") });
  });

  it("rejects zero amounts and empty transfer recipients", () => {
    expect(simulateTrade(state(), "buy", "ETH", 0).error).toContain("positive amount");
    expect(simulateTransfer(state(), "ETH", 0.1, " ").error).toContain("recipient");
  });
});
