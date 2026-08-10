import { describe, expect, it } from "vitest";
import {
  createCategorySchema,
  normalizeCategoryName,
  updateCategorySchema,
} from "../../shared/schemas/category";

describe("category schemas", () => {
  describe("createCategorySchema", () => {
    it("accepts a valid name + sortOrder", () => {
      const r = createCategorySchema.parse({ name: "Pets", sortOrder: 0 });
      expect(r).toEqual({ name: "Pets", sortOrder: 0 });
    });

    it("defaults sortOrder to 0", () => {
      const r = createCategorySchema.parse({ name: "Pets" });
      expect(r.sortOrder).toBe(0);
    });

    it("rejects empty name", () => {
      expect(() => createCategorySchema.parse({ name: "" })).toThrow();
      expect(() => createCategorySchema.parse({ name: "   " })).toThrow();
    });

    it("rejects name longer than 40 chars", () => {
      expect(() => createCategorySchema.parse({ name: "x".repeat(41) })).toThrow();
    });

    it("rejects negative sortOrder", () => {
      expect(() => createCategorySchema.parse({ name: "Pets", sortOrder: -1 })).toThrow();
    });

    it("rejects non-integer sortOrder", () => {
      expect(() => createCategorySchema.parse({ name: "Pets", sortOrder: 1.5 })).toThrow();
    });
  });

  describe("updateCategorySchema", () => {
    it("accepts an empty update", () => {
      expect(updateCategorySchema.parse({})).toEqual({});
    });

    it("accepts name only", () => {
      expect(updateCategorySchema.parse({ name: "Groceries" })).toEqual({
        name: "Groceries",
      });
    });

    it("accepts sortOrder only", () => {
      expect(updateCategorySchema.parse({ sortOrder: 3 })).toEqual({ sortOrder: 3 });
    });

    it("rejects empty name", () => {
      expect(() => updateCategorySchema.parse({ name: "" })).toThrow();
    });
  });

  describe("normalizeCategoryName", () => {
    it("lowercases + trims", () => {
      expect(normalizeCategoryName("  Food  ")).toBe("food");
      expect(normalizeCategoryName("GROCERIES")).toBe("groceries");
      expect(normalizeCategoryName("Pets")).toBe("pets");
    });

    it("treats Food/food/FOOD as the same key", () => {
      const a = normalizeCategoryName("Food");
      const b = normalizeCategoryName("food");
      const c = normalizeCategoryName("FOOD");
      expect(a).toBe(b);
      expect(b).toBe(c);
    });
  });
});
