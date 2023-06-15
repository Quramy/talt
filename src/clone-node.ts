import ts from "typescript";

// Typescript undocumented API, see Ron Buckton's explaination why it's not public:
// https://github.com/microsoft/TypeScript/issues/40507#issuecomment-737628756
// But it's very fit our case
const { cloneNode: _cloneNode } = ts.factory as any;

export function cloneNode<T extends ts.Node>(node: T): T {
  const cloned = _cloneNode(node);
  return ts.setOriginalNode(cloned, undefined); // remove original
}
