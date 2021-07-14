import ts from "typescript";

import { template } from "../";

const typeNode = template.type("{ readonly hoge: string }")();

// You can use `template` as tag function.
const typeNodeUsingTagFn = template.type`
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
