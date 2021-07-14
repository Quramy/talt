import ts from "typescript";

import { template, printNode } from "./";

describe("Node type", () => {
  test(template.type.name, () => {
    const node = template.type<ts.TypeLiteralNode>("{ a: 1 }")();
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

  test(template.sourceFile.name, () => {
    const node = template.sourceFile`type a = 100`();
    expect(ts.isSourceFile(node)).toBeTruthy();
    expect(printNode(node)).toMatchSnapshot();
  });
});

describe("Replacement", () => {
  test("node bind", () => {
    const idA = ts.factory.createIdentifier("A");
    const idB = ts.factory.createIdentifier("B");
    const node = template.type`{ a: ${idA}, b: ${idB} }`();
    expect(printNode(node)).toMatchSnapshot();
  });

  test("id placeholder", () => {
    const exp1 = template.expression`200 * 300`();
    const exp2 = ts.factory.createStringLiteral("some string");
    const fn = template.expression`100 + TO_BE_REPLACED`;
    const node1 = fn({
      TO_BE_REPLACED: exp1,
    });
    expect(printNode(node1)).toMatchSnapshot();
    const node2 = fn({
      TO_BE_REPLACED: exp2,
    });
    expect(printNode(node2)).toMatchSnapshot();
  });
});
