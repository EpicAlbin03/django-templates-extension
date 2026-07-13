export interface DjangoTagDoc {
  name: string;
  aliases?: string[];
  endTags?: string[];
  branches?: string[];
  branchDescriptions?: Record<string, string>;
  branchReferences?: Record<string, string>;
  endTagDescriptions?: Record<string, string>;
  endTagReferences?: Record<string, string>;
  relatedTags?: string[];
  load?: string;
  deprecated?: string;
  description: string;
  examples: string[];
  reference?: string;
}
