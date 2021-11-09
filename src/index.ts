import ts from "typescript";
import { LRUCache } from "./cache";
import { cloneNode } from "./clone-node";

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

const dummySrc = createSourceFile("");

const printer = ts.createPrinter({ removeComments: true });

const cache = new LRUCache<string, TypeScriptASTGenerator<ts.Node>>(200);

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function replace<T extends ts.Node>(s: T, idPlaceholders: Record<string, ts.Node> | undefined): T {
  const factory: ts.TransformerFactory<ts.Node> = ctx => {
    const visitor = (node: ts.Node): ts.Node => {
      if (!ts.isIdentifier(node)) {
        return cloneNode(ts.visitEachChild(node, visitor, ctx));
      }
      const idv = node.escapedText as string;
      if (!idPlaceholders || !idPlaceholders![idv]) return cloneNode(node);
      return idPlaceholders![idv];
    };
    return visitor;
  };
  const result = ts.transform(s, [factory]);
  const node = result.transformed[0] as T;
  result.dispose();
  return node;
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

function tryGetGeneratorFromCache<T extends ts.Node, S extends TypeScriptASTGenerator<T>>(
  type: "typeNode" | "expression" | "statement" | "jsxAttribute" | "sourceFile",
  text: string,
  cb: (source: ts.SourceFile) => S,
) {
  const key = `// ${type}` + "\n" + text;
  const cached = cache.get(key);
  if (cached) {
    return cached as S;
  }
  const source = createSourceFile(text);
  const generatorFn = cb(source);
  cache.set(key, generatorFn);
  return generatorFn;
}

function typeTag<T extends ts.TypeNode = ts.TypeNode>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  return tryGetGeneratorFromCache(
    "typeNode",
    `type ${HIDDEN_IDENTIFIER_NAME} = ` + tagFnBase(templateStrings, ...placeholders),
    source => {
      const tad = source.statements[0] as ts.TypeAliasDeclaration;
      return createReplacer(tad.type as T);
    },
  );
}

function expressionTag<T extends ts.Expression = ts.Expression>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  return tryGetGeneratorFromCache(
    "expression",
    `${HIDDEN_IDENTIFIER_NAME} = ` + tagFnBase(templateStrings, ...placeholders),
    source => {
      const stmt = source.statements[0] as ts.ExpressionStatement;
      const exp = stmt.expression as ts.BinaryExpression;
      return createReplacer(exp.right as T);
    },
  );
}

function statementTag<T extends ts.Statement = ts.Statement>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  return tryGetGeneratorFromCache("statement", tagFnBase(templateStrings, ...placeholders), source =>
    createReplacer(source.statements[0] as T),
  );
}

function jsxAttributeTag<T extends ts.JsxAttributeLike = ts.JsxAttribute>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  return tryGetGeneratorFromCache(
    "jsxAttribute",
    `${HIDDEN_IDENTIFIER_NAME} = <div ${tagFnBase(templateStrings, ...placeholders)} />`,
    source => {
      const stmt = source.statements[0] as ts.ExpressionStatement;
      const exp = stmt.expression as ts.BinaryExpression;
      const elm = exp.right as ts.JsxSelfClosingElement;
      return createReplacer(elm.attributes.properties[0] as T);
    },
  );
}

function sourceTag<T extends ts.SourceFile>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node)[]
) {
  return tryGetGeneratorFromCache("sourceFile", tagFnBase(templateStrings, ...placeholders), source =>
    createReplacer(source as T),
  );
}

export function clearCache() {
  cache.clearAll();
}

export function printNode(node: ts.Node) {
  return printer.printNode(ts.EmitHint.Unspecified, node, dummySrc);
}

export const template: {
  readonly typeNode: TypeScriptASTGeneratorBuilder<ts.TypeNode>;
  readonly expression: TypeScriptASTGeneratorBuilder<ts.Expression>;
  readonly statement: TypeScriptASTGeneratorBuilder<ts.Statement>;
  readonly jsxAttribute: TypeScriptASTGeneratorBuilder<ts.JsxAttributeLike>;
  readonly sourceFile: TypeScriptASTGeneratorBuilder<ts.SourceFile>;
} = {
  typeNode: typeTag,
  expression: expressionTag,
  statement: statementTag,
  jsxAttribute: jsxAttributeTag,
  sourceFile: sourceTag,
};
