export type DjangoNode = RootNode | ExpressionNode | StatementNode | BlockNode | CommentNode | RawNode;

export interface BaseNode {
    type: string;
    id: string;
    content: string;
    originalText: string;
    preNewLines: number;
    index: number;
    length: number;
    nodes: Record<string, DjangoNode>;
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
}
