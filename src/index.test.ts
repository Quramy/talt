import { describe, test } from "node:test";

import ts from "typescript";

import { template, printNode } from "./index.ts";

describe("Node type", () => {
  test(template.typeNode.name, t => {
    const node = template.typeNode<ts.TypeLiteralNode>`{ a: 1 }`();
    t.assert.equal(ts.isTypeLiteralNode(node), true);
    t.assert.snapshot(printNode(node));
  });

  test(template.expression.name, t => {
    const node = template.expression<ts.ObjectLiteralExpression>`{ a: 1 }`();
    t.assert.equal(ts.isObjectLiteralExpression(node), true);
    t.assert.snapshot(printNode(node));
  });

  test(template.statement.name, t => {
    const node = template.statement<ts.TypeAliasDeclaration>`type a = 100`();
    t.assert.equal(ts.isTypeAliasDeclaration(node), true);
    t.assert.snapshot(printNode(node));
  });

  test(template.jsxAttribute.name, t => {
    const node = template.jsxAttribute<ts.JsxAttribute>`id={id}`();
    t.assert.equal(ts.isJsxAttribute(node), true);
    t.assert.snapshot(printNode(node));
  });

  test(template.sourceFile.name, t => {
    const node = template.sourceFile`type a = 100`();
    t.assert.equal(ts.isSourceFile(node), true);
    t.assert.snapshot(printNode(node));
  });
});

describe("Replacement", () => {
  test("compiled function generates new node instance", t => {
    const fn = template.expression("100 + 100");
    const nodeA = fn();
    const nodeB = fn();
    t.assert.notStrictEqual(nodeA, nodeB);
  });

  test("Generated node does not have position", t => {
    const fn = template.expression("hoge");
    const node = fn();
    t.assert.throws(() => node.getStart());
    t.assert.throws(() => node.getWidth());
  });

  test("string placeholder", t => {
    const idA = "A";
    const idB = "B";
    const node = template.typeNode`{ a: ${idA}, b: ${idB} }`();
    t.assert.snapshot(printNode(node));
  });

  test("node bind", t => {
    const idA = ts.factory.createIdentifier("A");
    const idB = ts.factory.createIdentifier("B");
    const node = template.typeNode`{ a: ${idA}, b: ${idB} }`();
    t.assert.snapshot(printNode(node));
  });

  describe("id placeholder", () => {
    test("replacement", t => {
      const exp = template.expression`200 * 300`();
      const fn = template.expression`100 + TO_BE_REPLACED`;
      const node = fn({
        TO_BE_REPLACED: exp,
      });
      t.assert.snapshot(printNode(node));
    });

    test("same identifiers", t => {
      const exp = template.expression`200 * 300`();
      const fn = template.expression`100 + TO_BE_REPLACED + TO_BE_REPLACED`;
      const node = fn({
        TO_BE_REPLACED: exp,
      });
      t.assert.snapshot(printNode(node));
    });

    test("anonymous function", t => {
      const node = template.expression`
        100 * ${template.expression`fuga * ${() => ts.factory.createNumericLiteral(10)}`}
      `();
      t.assert.snapshot(printNode(node));
    });

    test("nested", t => {
      const node = template.expression`
        100 * ${template.expression`hoge * TO_BE_REPLACED`}
      `({
        TO_BE_REPLACED: template.expression`200`(),
      });
      t.assert.snapshot(printNode(node));
    });

    test("identifier to type node replacement at type reference", t => {
      const node = template.statement`
        type X = TO_BE_REPLACED
      `({
        TO_BE_REPLACED: ts.factory.createTypeLiteralNode([]),
      });
      t.assert.snapshot(printNode(node));
    });

    test("identifier to identifier replacement at type reference", t => {
      const node = template.statement`
        type X = TO_BE_REPLACED
      `({
        TO_BE_REPLACED: ts.factory.createIdentifier("After"),
      });
      t.assert.snapshot(printNode(node));
    });

    test("identifier to type node replacement at nested type reference", t => {
      const node = template.statement`
        type X = Y<TO_BE_REPLACED>
      `({
        TO_BE_REPLACED: ts.factory.createTypeLiteralNode([]),
      });
      t.assert.snapshot(printNode(node));
    });

    test("identifier to identifier replacement at nested type reference", t => {
      const node = template.statement`
        type X = Y<TO_BE_REPLACED>
      `({
        TO_BE_REPLACED: ts.factory.createIdentifier("After"),
      });
      t.assert.snapshot(printNode(node));
    });
  });
});
