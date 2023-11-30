import ts from "typescript";
import { LRUCache } from "./cache.js";
import { cloneNode } from "./clone-node.js";

export interface TypeScriptASTGenerator<T extends ts.Node> {
  (idPlaceholders?: Record<string, ts.Node>): T;
}

export type Placeholder = string | ts.Node | TypeScriptASTGenerator<ts.Node>;

export interface TypeScriptASTGeneratorBuilder<S extends ts.Node> {
  <T extends S>(
    templateStrings: string | TemplateStringsArray,
    ...placeholders: Placeholder[]
  ): TypeScriptASTGenerator<T>;
}

type TypeScriptASTGeneratorMap = Map<string, TypeScriptASTGenerator<ts.Node>>;

const HIDDEN_IDENTIFIER_NAME = "__TALT_HIDDEN__";

const dummySrc = createSourceFile("");

const printer = ts.createPrinter({ removeComments: true });

const sourceFileCache = new LRUCache<string, ts.SourceFile>(200);

function replace<T extends ts.Node>(s: T, idPlaceholders: Record<string, ts.Node> | undefined): T {
  const factory: ts.TransformerFactory<ts.Node> = ctx => {
    const visitor = (node: ts.Node): ts.Node => {
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        const idv = node.typeName.escapedText as string;
        if (!idv || !idPlaceholders || !idPlaceholders![idv]) return cloneNode(ts.visitEachChild(node, visitor, ctx));
        const after = idPlaceholders![idv];
        if (ts.isIdentifier(after) || ts.isQualifiedName(after)) {
          const typeArguments = node.typeArguments
            ? (ts.visitNodes(node.typeArguments, n =>
                cloneNode(ts.visitEachChild(n, visitor, ctx)),
              ) as ts.NodeArray<ts.TypeNode>)
            : undefined;
          return ts.factory.updateTypeReferenceNode(node, after, typeArguments);
        } else {
          return after;
        }
      } else if (ts.isIdentifier(node)) {
        const idv = node.escapedText as string;
        if (!idv || !idPlaceholders || !idPlaceholders![idv]) return cloneNode(node);
        return idPlaceholders![idv];
      } else {
        return cloneNode(ts.visitEachChild(node, visitor, ctx));
      }
    };
    return visitor;
  };
  const result = ts.transform(s, [factory]);
  const node = result.transformed[0] as T;
  result.dispose();
  return node;
}

function createAstGenerator<T extends ts.Node>(
  templateNode: T,
  astGeneratorMap: TypeScriptASTGeneratorMap,
): TypeScriptASTGenerator<T> {
  return placeholders => {
    const idPlaceholders = { ...placeholders };
    for (const [key, generatorFn] of astGeneratorMap.entries()) {
      idPlaceholders[key] = generatorFn(placeholders);
    }
    return replace(templateNode, idPlaceholders);
  };
}

function sourceTextFrom(
  templateStrings: TemplateStringsArray | string,
  ...placeholders: Placeholder[]
): [string, TypeScriptASTGeneratorMap] {
  const fnMap = new Map<string, TypeScriptASTGenerator<ts.Node>>();
  if (typeof templateStrings === "string") return [templateStrings, fnMap];
  let sourceText = templateStrings[0];
  for (let i = 1; i < templateStrings.length; i++) {
    const p = placeholders[i - 1];
    if (typeof p === "function") {
      const key = `_ID_FN${i}_`;
      sourceText += key;
      fnMap.set(key, p);
    } else if (typeof p === "string") {
      sourceText += p;
    } else {
      sourceText += printNode(p);
    }
    sourceText += templateStrings[i];
  }
  return [sourceText, fnMap];
}

function createSourceFile(srcString: string) {
  return ts.createSourceFile("", srcString, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
}

function parseSourceFile(sourceText: string) {
  const key = sourceText;
  let sourceFile = sourceFileCache.get(key);
  if (!sourceFile) {
    sourceFile = createSourceFile(sourceText);
    sourceFileCache.set(key, sourceFile);
  }
  return sourceFile;
}

function parseStatement<T extends ts.Statement>(statementText: string) {
  const sourceFile = parseSourceFile(statementText);
  return sourceFile.statements[0] as T;
}

function sourceTag<T extends ts.SourceFile>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: Placeholder[]
) {
  const [text, lazyAstGeneratorMap] = sourceTextFrom(templateStrings, ...placeholders);
  const sourceFile = parseSourceFile(text);
  return createAstGenerator(sourceFile as T, lazyAstGeneratorMap);
}

function statementTag<T extends ts.Statement = ts.Statement>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: Placeholder[]
) {
  const [text, lazyAstGeneratorMap] = sourceTextFrom(templateStrings, ...placeholders);
  const statement = parseStatement<T>(text);
  return createAstGenerator(statement, lazyAstGeneratorMap);
}

function typeNodeTag<T extends ts.TypeNode = ts.TypeNode>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: Placeholder[]
) {
  const [text, lazyAstGeneratorMap] = sourceTextFrom(templateStrings, ...placeholders);
  const statement = parseStatement<ts.TypeAliasDeclaration>(`type ${HIDDEN_IDENTIFIER_NAME} = ${text}`);
  return createAstGenerator(statement.type as T, lazyAstGeneratorMap);
}

function expressionTag<T extends ts.Expression = ts.Expression>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: Placeholder[]
) {
  const [text, lazyAstGeneratorMap] = sourceTextFrom(templateStrings, ...placeholders);
  const statement = parseStatement<ts.ExpressionStatement>(`${HIDDEN_IDENTIFIER_NAME} = ${text}`);
  const expression = statement.expression as ts.BinaryExpression;
  return createAstGenerator(expression.right as T, lazyAstGeneratorMap);
}

function jsxAttributeTag<T extends ts.JsxAttributeLike = ts.JsxAttribute>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: Placeholder[]
) {
  const [text, lazyAstGeneratorMap] = sourceTextFrom(templateStrings, ...placeholders);
  const statement = parseStatement<ts.ExpressionStatement>(`<div ${text} />`);
  const element = statement.expression as ts.JsxSelfClosingElement;
  return createAstGenerator(element.attributes.properties[0] as T, lazyAstGeneratorMap);
}

export function clearCache() {
  sourceFileCache.clearAll();
}

export function printNode(node: ts.Node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, dummySrc);
}

export const template: {
  readonly sourceFile: TypeScriptASTGeneratorBuilder<ts.SourceFile>;
  readonly statement: TypeScriptASTGeneratorBuilder<ts.Statement>;
  readonly typeNode: TypeScriptASTGeneratorBuilder<ts.TypeNode>;
  readonly expression: TypeScriptASTGeneratorBuilder<ts.Expression>;
  readonly jsxAttribute: TypeScriptASTGeneratorBuilder<ts.JsxAttributeLike>;
} = {
  sourceFile: sourceTag,
  statement: statementTag,
  typeNode: typeNodeTag,
  expression: expressionTag,
  jsxAttribute: jsxAttributeTag,
};
