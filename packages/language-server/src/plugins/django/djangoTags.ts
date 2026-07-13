import type { DjangoTagDoc } from "./djangoTagTypes.js";
import { djangoContribTagDocs } from "./djangoTagsContrib.js";
import { djangoAdditionalCoreTagDocs, djangoCoreTagDocs } from "./djangoTagsCore.js";
import { djangoThirdPartyTagDocs } from "./djangoTagsThirdParty.js";

export type { DjangoTagDoc } from "./djangoTagTypes.js";
export { djangoContribTagDocs } from "./djangoTagsContrib.js";
export { djangoAdditionalCoreTagDocs, djangoCoreTagDocs } from "./djangoTagsCore.js";
export { djangoThirdPartyTagDocs } from "./djangoTagsThirdParty.js";

export const djangoTagDocs: DjangoTagDoc[] = [
  ...djangoCoreTagDocs,
  ...djangoContribTagDocs,
  ...djangoAdditionalCoreTagDocs,
  ...djangoThirdPartyTagDocs,
];

export const djangoTagDocsByName = new Map<string, DjangoTagDoc>();

for (const doc of djangoTagDocs) {
  const relatedTags = [
    doc.name,
    ...(doc.aliases ?? []),
    ...(doc.branches ?? []),
    ...(doc.endTags ?? []),
  ];

  registerTagDoc(doc.name, doc, relatedTags);

  for (const alias of doc.aliases ?? []) {
    registerTagDoc(alias, doc, relatedTags);
  }

  for (const branch of doc.branches ?? []) {
    registerTagDoc(branch, doc, relatedTags, {
      description: doc.branchDescriptions?.[branch],
      reference: doc.branchReferences?.[branch],
    });
  }

  for (const endTag of doc.endTags ?? []) {
    registerTagDoc(endTag, doc, relatedTags, {
      description: doc.endTagDescriptions?.[endTag] ?? `Closes a \`{% ${doc.name} %}\` block.`,
      reference: doc.endTagReferences?.[endTag],
    });
  }
}

function registerTagDoc(
  name: string,
  doc: DjangoTagDoc,
  relatedTags: string[],
  overrides: Partial<Pick<DjangoTagDoc, "description" | "reference">> = {},
): void {
  const lookupDoc: DjangoTagDoc = {
    ...doc,
    ...overrides,
    name,
    description: overrides.description ?? doc.description,
    reference: overrides.reference ?? doc.reference,
    relatedTags: relatedTags.filter((relatedTag) => relatedTag !== name),
  };
  const existingDoc = djangoTagDocsByName.get(name);

  if (!existingDoc) {
    djangoTagDocsByName.set(name, lookupDoc);
    return;
  }

  djangoTagDocsByName.set(name, {
    ...existingDoc,
    relatedTags: Array.from(
      new Set([...(existingDoc.relatedTags ?? []), ...(lookupDoc.relatedTags ?? [])]),
    ),
  });
}
