import ts from "typescript";

import { template, printNode } from "./";

test(template.type.name, () => {
  const node = template.type`{ a: 1 }`;
  expect(ts.isTypeLiteralNode(node)).toBeTruthy();
  expect(printNode(node)).toMatchSnapshot();
});

test(template.expression.name, () => {
  const node = template.expression`{ a: 1 }`;
  expect(ts.isObjectLiteralExpression(node)).toBeTruthy();
  expect(printNode(node)).toMatchSnapshot();
});

test(template.statement.name, () => {
  const node = template.statement`type a = 100`;
  expect(ts.isTypeAliasDeclaration(node)).toBeTruthy();
  expect(printNode(node)).toMatchSnapshot();
});

test(template.sourceFile.name, () => {
  const node = template.sourceFile`type a = 100`;
  expect(ts.isSourceFile(node)).toBeTruthy();
  expect(printNode(node)).toMatchSnapshot();
});

test("node bind", () => {
  const idA = ts.factory.createIdentifier("A");
  const idB = ts.factory.createIdentifier("B");
  const node = template.type`{ a: ${idA}, b: ${idB} }`;
  expect(printNode(node)).toMatchSnapshot();
});
