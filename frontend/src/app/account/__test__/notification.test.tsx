// frontend/src/lib/__tests__/notifications.test.ts
import {
    shouldNotifyHighUv,
    shouldNotifyPersonalPicksUpdate,
  } from "../notifications";
  
  describe("shouldNotifyHighUv", () => {
    it("notifies on first visit if UV is high", () => {
      expect(shouldNotifyHighUv(null, "high")).toBe(true);
    });
  
    it("does not notify on first visit if UV is low", () => {
      expect(shouldNotifyHighUv(null, "low")).toBe(false);
    });
  
    it("notifies when UV goes from low to high (low > high)", () => {
      expect(shouldNotifyHighUv("low", "high")).toBe(true);
    });
  
    it("does not notify when UV stays low (low > low)", () => {
      expect(shouldNotifyHighUv("low", "low")).toBe(false);
    });
  
    it("does not notify when UV goes from high to low (high > low)", () => {
      expect(shouldNotifyHighUv("high", "low")).toBe(false);
    });
  
    it("does not notify when UV stays high (high > high)", () => {
      expect(shouldNotifyHighUv("high", "high")).toBe(false);
    });
  });
  
  describe("shouldNotifyPersonalPicksUpdate", () => {
    it("notifies when quiz count increases (user finished a new quiz)", () => {
      expect(shouldNotifyPersonalPicksUpdate(0, 1)).toBe(true);
      expect(shouldNotifyPersonalPicksUpdate(2, 3)).toBe(true);
    });
  
    it("does not notify when quiz count stays the same", () => {
      expect(shouldNotifyPersonalPicksUpdate(2, 2)).toBe(false);
    });
  
    it("does not notify if quiz count somehow decreases", () => {
      expect(shouldNotifyPersonalPicksUpdate(3, 2)).toBe(false);
    });
  });
  