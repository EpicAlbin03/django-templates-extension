export const Placeholder = {
  startToken: '#~',
  endToken: '~#',
};

export type PlaceholderKind = 'inline' | 'block' | 'attr';

export type DjangoNode =
  | RootNode
  | ExpressionNode
  | StatementNode
  | BlockNode
  | CommentNode
  | RawNode
  | IgnoreNode;

export interface BaseNode {
  type: string;
  id: string;
  content: string;
  originalText: string;
  preNewLines: number;
  index: number;
  length: number;
  nodes: Record<string, DjangoNode>;
  placeholderKind: PlaceholderKind;
  inTag?: boolean;
  inAttribute?: boolean;
}

export interface RootNode extends BaseNode {
  type: 'root';
}

export interface ExpressionNode extends BaseNode {
  type: 'expression';
}

export interface StatementNode extends BaseNode {
  type: 'statement';
  keyword: string;
  role: 'start' | 'branch' | 'end' | 'standalone';
}

export interface BlockNode extends BaseNode {
  type: 'block';
  start: StatementNode;
  end: StatementNode;
  containsNewLines: boolean;
}

export interface CommentNode extends BaseNode {
  type: 'comment';
}

export interface RawNode extends BaseNode {
  type: 'raw';
  keyword?: string;
  args?: string;
  body?: string;
  endArgs?: string;
}

export interface IgnoreNode extends BaseNode {
  type: 'ignore';
}
