import ts from "typescript";

const dummySrc = ts.createSourceFile("", "", ts.ScriptTarget.Latest);
const printer = ts.createPrinter({
  removeComments: true,
});

export function printNode(node: ts.Node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, dummySrc);
}

function tagFnBase(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  let srcString = templateStrings[0];
  for (let i = 1; i < templateStrings.length; i++) {
    srcString += printNode(placeholders[i - 1]);
    srcString += templateStrings[i];
  }
  return srcString;
}

function typeTag(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  const source = ts.createSourceFile(
    "",
    "type _ = " + tagFnBase(templateStrings, ...placeholders),
    ts.ScriptTarget.Latest,
  );
  const tad = source.statements[0] as ts.TypeAliasDeclaration;
  return tad.type;
}

function expressionTag(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  const source = ts.createSourceFile("", "_ = " + tagFnBase(templateStrings, ...placeholders), ts.ScriptTarget.Latest);
  const stmt = source.statements[0] as ts.ExpressionStatement;
  const exp = stmt.expression as ts.BinaryExpression;
  return exp.right;
}

function statementTag(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  const source = ts.createSourceFile("", tagFnBase(templateStrings, ...placeholders), ts.ScriptTarget.Latest);
  return source.statements[0];
}

function sourceTag(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  const source = ts.createSourceFile("", tagFnBase(templateStrings, ...placeholders), ts.ScriptTarget.Latest);
  return source;
}

export const template = {
  type: typeTag,
  expression: expressionTag,
  statement: statementTag,
  sourceFile: sourceTag,
};
