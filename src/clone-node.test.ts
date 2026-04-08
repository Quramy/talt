import { describe, it } from "node:test";
import assert from "node:assert";
import ts from "typescript";

import { cloneNode } from "./clone-node.ts";

describe(cloneNode.name, () => {
  it("should create a synthesized node", () => {
    const orig: ts.Node = ts.factory.createIdentifier("hoge");
    (orig as any).flags = 0;
    const cloned = cloneNode(orig);
    assert.strictEqual(cloned.flags & ts.NodeFlags.Synthesized, ts.NodeFlags.Synthesized);
  });

  it("should not link to original node", () => {
    const orig: ts.Node = ts.factory.createIdentifier("hoge");
    const cloned = cloneNode(orig);
    assert.strictEqual(ts.getOriginalNode(cloned), cloned);
  });

  it("should copy from node", () => {
    const orig: ts.Node = ts.factory.createIdentifier("hoge");
    const cloned = cloneNode(orig);
    assert.deepStrictEqual(cloned.getChildren(), []);
    assert.notStrictEqual(cloned, orig);
  });

  it("should shallow copy children", () => {
    const orig: ts.Node = ts.factory.createExpressionStatement(
      ts.factory.createBinaryExpression(
        ts.factory.createIdentifier("hoge"),
        ts.factory.createToken(ts.SyntaxKind.PlusToken),
        ts.factory.createIdentifier("fuga"),
      ),
    );
    const cloned = cloneNode(orig);
    assert.notStrictEqual(cloned, orig);
    const childrenFromOrig: ts.Node[] = [];
    orig.forEachChild(c => childrenFromOrig.push(c));
    const childrenFromCloned: ts.Node[] = [];
    cloned.forEachChild(c => childrenFromCloned.push(c));
    childrenFromCloned.forEach((c, i) => assert.strictEqual(c, childrenFromOrig[i]));
  });
});
