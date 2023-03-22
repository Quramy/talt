import ts from "typescript";
import { LRUCache } from "./cache.js";
import { cloneNode } from "./clone-node.js";

export interface TypeScriptASTGenerator<T extends ts.Node> {
  (idPlaceholders?: Record<string, ts.Node>): T;
}

export interface TypeScriptASTGeneratorBuilder<S extends ts.Node> {
  <T extends S>(
    templateStrings: string | TemplateStringsArray,
    ...placeholders: (string | ts.Node | TypeScriptASTGenerator<ts.Node>)[]
  ): TypeScriptASTGenerator<T>;
}

const HIDDEN_IDENTIFIER_NAME = "__TALT_HIDDEN__";

const dummySrc = createSourceFile("");

const printer = ts.createPrinter({ removeComments: true });

const cache = new LRUCache<string, ts.SourceFile>(200);

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

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

function createReplacer<T extends ts.Node>(templateNode: T, generatorMap: GeneratorMap): TypeScriptASTGenerator<T> {
  return placeholders => {
    const xxx = { ...placeholders };
    for (const [k, v] of generatorMap.entries()) {
      xxx[k] = v(placeholders);
    }
    return replace(templateNode, xxx);
  };
}

function createSourceFile(srcString: string) {
  return ts.createSourceFile("", srcString, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
}

type GeneratorMap = Map<string, TypeScriptASTGenerator<ts.Node>>;

type TagFnBaseResult = {
  text: string;
  fnMap: GeneratorMap;
};

function tagFnBase(
  templateStrings: TemplateStringsArray | string,
  ...placeholders: (ts.Node | string | TypeScriptASTGenerator<ts.Node>)[]
): TagFnBaseResult {
  const fnMap = new Map<string, TypeScriptASTGenerator<ts.Node>>();
  if (typeof templateStrings === "string") return { text: templateStrings, fnMap };
  let srcString = templateStrings[0];
  for (let i = 1; i < templateStrings.length; i++) {
    const p = placeholders[i - 1];
    if (typeof p === "function") {
      const key = `_ID_FN${i}_`;
      srcString += key;
      fnMap.set(key, p);
    } else if (typeof p === "string") {
      srcString += p;
    } else {
      srcString += printNode(p);
    }
    srcString += templateStrings[i];
  }
  return { text: srcString, fnMap };
}

function tryGetGeneratorFromCache<T extends ts.Node, S extends TypeScriptASTGenerator<T>>(
  type: "typeNode" | "expression" | "statement" | "jsxAttribute" | "sourceFile",
  { text, fnMap }: TagFnBaseResult,
  textModifier: (text: string) => string,
  cb: (source: ts.SourceFile, fnMap: GeneratorMap) => S,
) {
  const src = textModifier(text);
  const key = `// ${type}` + "\n" + src;
  let cached = cache.get(key);
  if (!cached) {
    cached = createSourceFile(src);
    cache.set(key, cached);
  }
  const generatorFn = cb(cached, fnMap);
  return generatorFn;
}

function typeTag<T extends ts.TypeNode = ts.TypeNode>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node | TypeScriptASTGenerator<ts.Node>)[]
) {
  return tryGetGeneratorFromCache(
    "typeNode",
    tagFnBase(templateStrings, ...placeholders),
    text => `type ${HIDDEN_IDENTIFIER_NAME} = ` + text,
    (source, fnMap) => {
      const tad = source.statements[0] as ts.TypeAliasDeclaration;
      return createReplacer(tad.type as T, fnMap);
    },
  );
}

function expressionTag<T extends ts.Expression = ts.Expression>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node | TypeScriptASTGenerator<ts.Node>)[]
) {
  return tryGetGeneratorFromCache(
    "expression",
    tagFnBase(templateStrings, ...placeholders),
    text => `${HIDDEN_IDENTIFIER_NAME} = ` + text,
    (source, fnMap) => {
      const stmt = source.statements[0] as ts.ExpressionStatement;
      const exp = stmt.expression as ts.BinaryExpression;
      return createReplacer(exp.right as T, fnMap);
    },
  );
}

function statementTag<T extends ts.Statement = ts.Statement>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node | TypeScriptASTGenerator<ts.Node>)[]
) {
  return tryGetGeneratorFromCache(
    "statement",
    tagFnBase(templateStrings, ...placeholders),
    s => s,
    (source, fnMap) => createReplacer(source.statements[0] as T, fnMap),
  );
}

function jsxAttributeTag<T extends ts.JsxAttributeLike = ts.JsxAttribute>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node | TypeScriptASTGenerator<ts.Node>)[]
) {
  return tryGetGeneratorFromCache(
    "jsxAttribute",
    tagFnBase(templateStrings, ...placeholders),
    text => `${HIDDEN_IDENTIFIER_NAME} = <div ${text} />`,
    (source, fnMap) => {
      const stmt = source.statements[0] as ts.ExpressionStatement;
      const exp = stmt.expression as ts.BinaryExpression;
      const elm = exp.right as ts.JsxSelfClosingElement;
      return createReplacer(elm.attributes.properties[0] as T, fnMap);
    },
  );
}

function sourceTag<T extends ts.SourceFile>(
  templateStrings: string | TemplateStringsArray,
  ...placeholders: (string | ts.Node | TypeScriptASTGenerator<ts.Node>)[]
) {
  return tryGetGeneratorFromCache(
    "sourceFile",
    tagFnBase(templateStrings, ...placeholders),
    s => s,
    (source, fnMap) => createReplacer(source as T, fnMap),
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
