import ts from "typescript";

import { cloneNode } from "./clone-node.js";

describe(cloneNode, () => {
  it("should create a synthesized node", () => {
    const orig: ts.Node = ts.factory.createIdentifier("hoge");
    (orig as any).flags = 0;
    const cloned = cloneNode(orig);
    expect(cloned.flags & ts.NodeFlags.Synthesized).toBe(ts.NodeFlags.Synthesized);
  });

  it("should not link to original node", () => {
    const orig: ts.Node = ts.factory.createIdentifier("hoge");
    const cloned = cloneNode(orig);
    expect(ts.getOriginalNode(cloned)).toBe(cloned);
  });

  it("should copy from node", () => {
    const orig: ts.Node = ts.factory.createIdentifier("hoge");
    const cloned = cloneNode(orig);
    expect(cloned.getChildren()).toStrictEqual([]);
    expect(cloned).not.toBe(orig);
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
    expect(cloned).not.toBe(orig);
    const childrenFromOrig: ts.Node[] = [];
    orig.forEachChild(c => childrenFromOrig.push(c));
    const childrenFromCloned: ts.Node[] = [];
    cloned.forEachChild(c => childrenFromCloned.push(c));
    childrenFromCloned.forEach((c, i) => expect(c).toBe(childrenFromOrig[i]));
  });
});
