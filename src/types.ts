export type DjangoNode =
    | TextNode
    | VariableNode
    | CommentNode
    | TagNode
    | RawBlockNode;

export interface BaseNode {
    type: string;
    raw: string;
    start: number;
    end: number;
    inAttribute: boolean;
}

export interface TextNode extends BaseNode {
    type: 'Text';
    content: string;
}

export interface VariableNode extends BaseNode {
    type: 'Variable';
    content: string;
}

export interface CommentNode extends BaseNode {
    type: 'Comment';
    content: string;
}

export type TagRole = 'start' | 'branch' | 'end' | 'standalone';

export interface TagNode extends BaseNode {
    type: 'Tag';
    content: string;
    name: string;
    args: string;
    role: TagRole;
}

export interface RawBlockNode extends BaseNode {
    type: 'RawBlock';
    name: string;
    inner: string;
}

export interface DjangoAst {
    type: 'DjangoRoot';
    children: DjangoNode[];
}

export type PlaceholderKind = 'inline' | 'block' | 'attribute' | 'raw';

export interface PlaceholderRecord {
    key: string;
    value: string;
    kind: PlaceholderKind;
}

export interface TransformResult {
    transformed: string;
    placeholders: Record<string, string>;
}
