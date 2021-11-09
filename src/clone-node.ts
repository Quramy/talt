import ts from "typescript";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export function cloneNode<T extends ts.Node>(node: T): T {
  const props = { ...node } as Mutable<T>;
  props.pos = -1;
  props.end = -1;
  const base = new (node as any).constructor();
  Object.keys(props).forEach(k => {
    base[k] = props[k as keyof T];
  });
  return base as T;
}
