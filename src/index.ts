import ts from "typescript";

const HIDDEN_IDENTIFIER_NAME = "__TALT_HIDDEN__";

const dummySrc = ts.createSourceFile("", "", ts.ScriptTarget.Latest);
const printer = ts.createPrinter({
  removeComments: true,
});

export function printNode(node: ts.Node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, dummySrc);
}

function replace<T extends ts.Node>(s: T, idPlaceholders: Record<string, ts.Node> | undefined): T {
  const factory: ts.TransformerFactory<ts.Node> = ctx => {
    const isEmpty = !idPlaceholders || Object.keys(idPlaceholders).length === 0;
    const visitor = (node: ts.Node): ts.Node => {
      if (isEmpty) return node;
      if (!ts.isIdentifier(node)) return ts.visitEachChild(node, visitor, ctx);
      const idv = node.escapedText as string;
      if (!idPlaceholders![idv]) return node;
      return idPlaceholders![idv];
    };
    return visitor;
  };
  const result = ts.transform(s, [factory]);
  return result.transformed[0] as T;
}

function createReplacer<T extends ts.Node>(templateNode: T): (idPlaceholders?: Record<string, ts.Node>) => T {
  return placeholders => replace(templateNode, placeholders);
}

function tagFnBase(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  let srcString = templateStrings[0];
  for (let i = 1; i < templateStrings.length; i++) {
    srcString += printNode(placeholders[i - 1]);
    srcString += templateStrings[i];
  }
  return srcString;
}

function typeTag<T extends ts.TypeNode = ts.TypeNode>(
  templateStrings: TemplateStringsArray,
  ...placeholders: ts.Node[]
) {
  const source = ts.createSourceFile(
    "",
    `type ${HIDDEN_IDENTIFIER_NAME} = ` + tagFnBase(templateStrings, ...placeholders),
    ts.ScriptTarget.Latest,
  );
  const tad = source.statements[0] as ts.TypeAliasDeclaration;
  return createReplacer(tad.type as T);
}

function expressionTag<T extends ts.Expression = ts.Expression>(
  templateStrings: TemplateStringsArray,
  ...placeholders: ts.Node[]
) {
  const source = ts.createSourceFile(
    "",
    `${HIDDEN_IDENTIFIER_NAME} = ` + tagFnBase(templateStrings, ...placeholders),
    ts.ScriptTarget.Latest,
  );
  const stmt = source.statements[0] as ts.ExpressionStatement;
  const exp = stmt.expression as ts.BinaryExpression;
  return createReplacer(exp.right as T);
}

function statementTag<T extends ts.Statement = ts.Statement>(
  templateStrings: TemplateStringsArray,
  ...placeholders: ts.Node[]
) {
  const source = ts.createSourceFile("", tagFnBase(templateStrings, ...placeholders), ts.ScriptTarget.Latest);
  return createReplacer(source.statements[0] as T);
}

function sourceTag(templateStrings: TemplateStringsArray, ...placeholders: ts.Node[]) {
  const source = ts.createSourceFile("", tagFnBase(templateStrings, ...placeholders), ts.ScriptTarget.Latest);
  return createReplacer(source);
}

export const template = {
  type: typeTag,
  expression: expressionTag,
  statement: statementTag,
  sourceFile: sourceTag,
};
