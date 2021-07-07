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

const typeNode = template.type`{ hoge: number }`; // returns ts.TypeLiteralNode

const id = ts.factory.createIdentifier("Foo");

const typeNodeWithPlaceholder = template.type`{ hoge: ${id} }`; // returns `{ hoge: Foo }` type AST node
```

## API

`template` has the following tag functions. Each tag function compiles and provides corresponding type AST.

- `template.type`
- `template.expression`
- `template.statement`
- `template.sourceFile`

## License

MIT
