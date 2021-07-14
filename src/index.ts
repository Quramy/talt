import ts from "typescript";

export interface TypeScriptASTGenerator<T extends ts.Node> {
  (idPlaceholders?: Record<string, ts.Node>): T;
}

export interface TypeScriptASTGeneratorBuilder<S extends ts.Node> {
  <T extends S>(
    templateStrings: string | TemplateStringsArray,
    ...placeholders: (string | ts.Node)[]
  ): TypeScriptASTGenerator<T>;
}

const HIDDEN_IDENTIFIER_NAME = "__TALT_HIDDEN__";

const dummySrc = ts.createSourceFile("", "", ts.ScriptTarget.Latest);
const printer = ts.createPrinter({
  removeComments: true,
});

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

function createReplacer<T extends ts.Node>(templateNode: T): TypeScriptASTGenerator<T> {
  return placeholders => replace(templateNode, placeholders);
}

function createSourceFile(srcString: string) {
  return ts.createSourceFile("", srcString, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
}

function tagFnBase(templateStrings: TemplateStringsArray | string, ...placeholders: (ts.Node | string)[]) {
  if (typeof templateStrings === "string") return templateStrings;
  let srcString = templateStrings[0];
  for (let i = 1; i < templateStrings.length; i++) {
    const p = placeholders[i - 1];
    srcString += typeof p === "string" ? p : printNode(p);
    srcString += templateStrings[i];
  }
  return srcString;
}

function typeTag<T extends ts.TypeNode = ts.TypeNode>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  const source = createSourceFile(`type ${HIDDEN_IDENTIFIER_NAME} = ` + tagFnBase(templateStrings, ...placeholders));
  const tad = source.statements[0] as ts.TypeAliasDeclaration;
  return createReplacer(tad.type as T);
}

function expressionTag<T extends ts.Expression = ts.Expression>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  const source = createSourceFile(`${HIDDEN_IDENTIFIER_NAME} = ` + tagFnBase(templateStrings, ...placeholders));
  const stmt = source.statements[0] as ts.ExpressionStatement;
  const exp = stmt.expression as ts.BinaryExpression;
  return createReplacer(exp.right as T);
}

function statementTag<T extends ts.Statement = ts.Statement>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  const source = createSourceFile(tagFnBase(templateStrings, ...placeholders));
  return createReplacer(source.statements[0] as T);
}

function sourceTag<T extends ts.SourceFile>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  const source = createSourceFile(tagFnBase(templateStrings, ...placeholders));
  return createReplacer(source as T);
}

export function printNode(node: ts.Node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, dummySrc);
}

export const template: {
  readonly typeNode: TypeScriptASTGeneratorBuilder<ts.TypeNode>;
  readonly expression: TypeScriptASTGeneratorBuilder<ts.Expression>;
  readonly statement: TypeScriptASTGeneratorBuilder<ts.Statement>;
  readonly sourceFile: TypeScriptASTGeneratorBuilder<ts.SourceFile>;
} = {
  typeNode: typeTag,
  expression: expressionTag,
  statement: statementTag,
  sourceFile: sourceTag,
};
