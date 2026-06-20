import assert from "assert";
import { FileMap, FileSet } from "../../../src/lib/documents/fileCollection";

describe("fileCollection", () => {
  describe("FileSet", () => {
    it("has (case sensitive)", () => {
      const set = new FileSet(/** useCaseSensitiveFileNames */ true);

      set.add("hi.html");

      assert.strictEqual(set.has("Hi.html"), false);
      assert.ok(set.has("hi.html"));
    });

    it("delete (case sensitive)", () => {
      const set = new FileSet(/** useCaseSensitiveFileNames */ true);

      set.add("hi.html");

      assert.strictEqual(set.delete("Hi.html"), false);
      assert.ok(set.delete("hi.html"));
    });

    it("has (case insensitive)", () => {
      const set = new FileSet(/** useCaseSensitiveFileNames */ false);

      set.add("hi.html");

      assert.ok(set.has("Hi.html"));
    });

    it("delete (case sensitive)", () => {
      const set = new FileSet(/** useCaseSensitiveFileNames */ false);

      set.add("hi.html");

      assert.ok(set.delete("Hi.html"));
    });
  });

  describe("FileMap", () => {
    it("has (case sensitive)", () => {
      const map = new FileMap(/** useCaseSensitiveFileNames */ true);
      const info = {};

      map.set("hi.html", info);

      assert.strictEqual(map.has("Hi.html"), false);
      assert.ok(map.has("hi.html"));
    });

    it("get (case sensitive)", () => {
      const map = new FileMap(/** useCaseSensitiveFileNames */ true);
      const info = {};

      map.set("hi.html", info);

      assert.strictEqual(map.get("Hi.html"), undefined);
      assert.strictEqual(map.get("hi.html"), info);
    });

    it("delete (case sensitive)", () => {
      const map = new FileMap(/** useCaseSensitiveFileNames */ true);
      const info = {};

      map.set("hi.html", info);

      assert.strictEqual(map.delete("Hi.html"), false);
      assert.ok(map.has("hi.html"));
    });

    it("has (case insensitive)", () => {
      const map = new FileMap(/** useCaseSensitiveFileNames */ false);
      const info = {};

      map.set("hi.html", info);

      assert.ok(map.has("Hi.html"));
    });

    it("get (case insensitive)", () => {
      const map = new FileMap(/** useCaseSensitiveFileNames */ false);
      const info = {};

      map.set("hi.html", info);

      assert.strictEqual(map.get("Hi.html"), info);
    });

    it("delete (case insensitive)", () => {
      const map = new FileMap(/** useCaseSensitiveFileNames */ false);
      const info = {};

      map.set("hi.html", info);

      assert.strictEqual(map.delete("Hi.html"), true);
    });
  });
});
