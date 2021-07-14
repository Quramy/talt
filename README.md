# Talt

Template functions to generate TypeScript AST .

## Install

```sh
$ npm i talt typescript
```

## Usage

```ts
import ts from "typescript";
import { template } from "talt";

const typeNode = template.type`{ hoge: number }`(); // returns ts.TypeLiteralNode

const exp = template.expression<ts.BinraryExpressionNode>`200 * 2`(); // returns ts.BinraryExpressionNode

const fn = template.expression`100 + RIGHT_HAND_EXP`;

const ast = fn({
  RIGHT_HAND_EXP: exp,
}); // returns ts.ExpressionNode corresponding to `100 + 200 * 2`
```

## API

`template` has the following tag functions. Each tag function compiles and provides corresponding type AST.

- `template.type`
- `template.expression`
- `template.statement`
- `template.sourceFile`

## License

MIT
