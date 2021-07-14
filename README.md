# Talt

Template functions to generate TypeScript AST, inspired from [@babel/template](https://babeljs.io/docs/en/babel-template) .

## Install

```sh
$ npm i talt typescript
```

## Usage

```ts
import ts from "typescript";
import { template } from "talt";

const typeNode = template.typeNode("{ readonly hoge: string }")();

// You can use `template` as tag function.
const typeNodeUsingTagFn = template.typeNode`
  {
    readonly hoge: string;
  }
`();

// The following returns ts.BinaryExpression
const binaryExpression = template.expression<ts.BinaryExpression>("60 * 1000")();

// You can use identifier placeholder.
const compiledFn = template.expression`
  60 * SOME_PLACEHOLDER_KEY
`;
const generatedAst = compiledFn({
  SOME_PLACEHOLDER_KEY: binaryExpression,
}); // returns expression node, `60 * 60 * 1000`

const generetedOtherNode = compiledFn({
  SOME_PLACEHOLDER_KEY: ts.factory.createNumericLiteral("200"),
}); // returns expression node, `60 * 200`
```

## API

`template` has the following tag functions. Each tag function compiles and provides corresponding type AST.

- `template.typeNode`
- `template.expression`
- `template.statement`
- `template.sourceFile`

## License

MIT
