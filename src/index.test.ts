import ts from "typescript";

import { template, printNode, clearCache } from "./index.js";

describe("Node type", () => {
  test(template.typeNode.name, () => {
    const node = template.typeNode<ts.TypeLiteralNode>`{ a: 1 }`();
    expect(ts.isTypeLiteralNode(node)).toBeTruthy();
    expect(printNode(node)).toMatchSnapshot();
  });

  test(template.expression.name, () => {
    const node = template.expression<ts.ObjectLiteralExpression>`{ a: 1 }`();
    expect(ts.isObjectLiteralExpression(node)).toBeTruthy();
    expect(printNode(node)).toMatchSnapshot();
  });

  test(template.statement.name, () => {
    const node = template.statement<ts.TypeAliasDeclaration>`type a = 100`();
    expect(ts.isTypeAliasDeclaration(node)).toBeTruthy();
    expect(printNode(node)).toMatchSnapshot();
  });

  test(template.jsxAttribute.name, () => {
    const node = template.jsxAttribute<ts.JsxAttribute>`id={id}`();
    expect(ts.isJsxAttribute(node)).toBeTruthy();
    expect(printNode(node)).toMatchSnapshot();
  });

  test(template.sourceFile.name, () => {
    const node = template.sourceFile`type a = 100`();
    expect(ts.isSourceFile(node)).toBeTruthy();
    expect(printNode(node)).toMatchSnapshot();
  });
});

describe("Replacement", () => {
  test("compiled function generates new node instance", () => {
    const fn = template.expression("100 + 100");
    const nodeA = fn();
    const nodeB = fn();
    expect(nodeA === nodeB).toBeFalsy();
  });

  test("Generated node does not have position", () => {
    const fn = template.expression("hoge");
    const node = fn();
    expect(() => node.getStart()).toThrowError();
    expect(() => node.getWidth()).toThrowError();
  });

  test("string placeholder", () => {
    const idA = "A";
    const idB = "B";
    const node = template.typeNode`{ a: ${idA}, b: ${idB} }`();
    expect(printNode(node)).toMatchSnapshot();
  });

  test("node bind", () => {
    const idA = ts.factory.createIdentifier("A");
    const idB = ts.factory.createIdentifier("B");
    const node = template.typeNode`{ a: ${idA}, b: ${idB} }`();
    expect(printNode(node)).toMatchSnapshot();
  });

  describe("id placeholder", () => {
    test("replacement", () => {
      const exp = template.expression`200 * 300`();
      const fn = template.expression`100 + TO_BE_REPLACED`;
      const node = fn({
        TO_BE_REPLACED: exp,
      });
      expect(printNode(node)).toMatchSnapshot();
    });

    test("same identifiers", () => {
      const exp = template.expression`200 * 300`();
      const fn = template.expression`100 + TO_BE_REPLACED + TO_BE_REPLACED`;
      const node = fn({
        TO_BE_REPLACED: exp,
      });
      expect(printNode(node)).toMatchSnapshot();
    });

    test("anonymous function", () => {
      const node = template.expression`
        100 * ${template.expression`fuga * ${() => ts.factory.createNumericLiteral(10)}`}
      `();
      expect(printNode(node)).toMatchSnapshot();
    });

    test("nested", () => {
      const node = template.expression`
        100 * ${template.expression`hoge * TO_BE_REPLACED`}
      `({
        TO_BE_REPLACED: template.expression`200`(),
      });
      expect(printNode(node)).toMatchSnapshot();
    });
  });
});
