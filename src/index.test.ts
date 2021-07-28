import ts from "typescript";

import { template, printNode } from "./";

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

  test("id placeholder", () => {
    const exp = template.expression`200 * 300`();
    const fn = template.expression`100 + TO_BE_REPLACED`;
    const node = fn({
      TO_BE_REPLACED: exp,
    });
    expect(printNode(node)).toMatchSnapshot();
  });
});
