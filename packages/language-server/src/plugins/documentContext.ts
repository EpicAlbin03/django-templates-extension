/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// adopted from https://github.com/microsoft/vscode/blob/5ffcfde11d8b1b57634627f5094907789db09776/extensions/css-language-features/server/src/utils/documentContext.ts

import { DocumentContext } from "vscode-css-languageservice";
import { WorkspaceFolder } from "vscode-languageserver";
import { Utils, URI } from "vscode-uri";

export function getDocumentContext(
  documentUri: string,
  workspaceFolders: WorkspaceFolder[],
): DocumentContext {
  function getRootFolder(): string | undefined {
    for (const folder of workspaceFolders) {
      let folderURI = folder.uri;
      if (!folderURI.endsWith("/")) {
        folderURI = folderURI + "/";
      }
      if (documentUri.startsWith(folderURI)) {
        return folderURI;
      }
    }
    return undefined;
  }

  return {
    resolveReference: (ref: string, base: string) => {
      if (ref[0] === "/") {
        // resolve absolute path against the current workspace folder
        const folderUri = getRootFolder();
        if (folderUri) {
          return folderUri + ref.substr(1);
        }
      }
      const baseReference = base || documentUri;
      const baseUri = baseReference.substr(0, baseReference.lastIndexOf("/") + 1);
      return Utils.resolvePath(URI.parse(baseUri), ref).toString();
    },
  };
}
