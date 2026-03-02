// A separate module that can be mocked in tests
// (monaco-editor is not compatible with jsdom, used in vitest)
// Note that no other module should import monaco-editor directly; only this adapter module should do so
import {
  jsonLdExtension,
  setupLsp,
  setupVscodeApi,
  sparqlLdExtension,
  turtleExtension,
} from "swls-monaco";
import { EditorApp } from "monaco-languageclient/editorApp";
import { URI } from "@codingame/monaco-vscode-api/vscode/vs/base/common/uri";
import { editor } from "@codingame/monaco-vscode-editor-api";
import * as monaco from "@codingame/monaco-vscode-editor-api";

import workerUrl from "swls-monaco/lib/lsp-worker.js?worker&url";

let at = 0;
let config = null;

export async function addEditor(
  uri,
  code,
  extension,
  container,
  editorOptions,
) {
  const editorAppConfig = {
    editorOptions,
  };

  const editorApp = new EditorApp(editorAppConfig);

  await editorApp.start(container);

  const model = editor.createModel(code, extension.id, URI.parse(uri));
  editorApp.getEditor().setModel(model);
  return editorApp;
}

export async function createMonacoEditor(el, options) {
  const e = await addEditor(
    `inmemory://app/model-${at}.ttl`,
    "",
    turtleExtension,
    el,
    options,
  );
  at += 1;

  const editor = e.getEditor();
  return editor;
}

export async function init(configParam) {
  config = configParam;
  await setupVscodeApi();

  monaco.editor.defineTheme("semantic-theme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955" },
      { token: "keyword", foreground: "C586C0" },
      { token: "string", foreground: "CE9178" },
      { token: "langTag", foreground: "C586C0" },
      { token: "number", foreground: "B5CEA8" },
      { token: "boolean", foreground: "569CD6" },
      { token: "variable", foreground: "9CDCFE" },
      { token: "namespace", foreground: "4EC9B0" },
      { token: "property", foreground: "DCDCAA" },
      { token: "enum", foreground: "4FC1FF" },
      { token: "enumMember", foreground: "4FC1FF" },
    ],
    colors: {},
    semanticHighlighting: true,
  });

  const SWLSconfig = config.SWLSconfig || {};
 /* SWLSconfig.prefix_disabled = [
    "rml-"
  ];*/
  const thing = await setupLsp(
    workerUrl,
    SWLSconfig,
    turtleExtension.id,
    sparqlLdExtension.id,
    jsonLdExtension.id,
  );

  thing.getLanguageClient().onRequest("custom/readFile", (a, b, c) => {
    // You can return generated files here
    console.log(a, b, c);
    throw "nah";
  });
}
