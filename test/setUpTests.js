"use strict";

import { vi } from "vitest";
import "../scripts/ensure-config.js";

vi.mock(import("../lib/editor-adapter.js"), () => {
  let value;
  return {
    createMonacoEditor: vi.fn(() => ({
      getValue: vi.fn(() => {
        return value;
      }),
      setValue: vi.fn((newValue) => {
        value = newValue;
      }),
      setSelection: vi.fn(),
      setPosition: vi.fn(),
      focus: vi.fn(),
      onDidChangeModelContent: vi.fn(),
      dispose: vi.fn(),
    })),
    init: vi.fn(() => {}),
  };
});

// avoid loading css in tests by mocking the small helper module that imports the css
vi.mock("../lib/loadStyles.js", () => ({ default: {} }));

 
// import matey
import Matey from "../lib/matey";
global.matey = new Matey();
// import jsdom-worker to mock Worker object which doesn't work by default in Jest/jsdom
import "jsdom-worker-fix";

// set up document body
document.body.innerHTML = '<div id="test-editor"></div>';

// initialize matey
const config = {
  "title": "Default RML Playground",
    "RMLspecifications": [
      {
        "url": "https://rml.io/specs/rml/",
        "label": "initial RML specification published on rml.io"
      }
    ],
      "RMLengine": {
    "url": "",
      "label": "Default RMLMapper",
        "webAPI": "http://localhost:4000/execute"
  },
  "logo": "logo_rmlio",
    "surveyUrl": "https://docs.google.com/forms/d/e/1FAIpQLScGDS6W3BBMje5DpqT6HOwAkIrhFHg97_wjJbJoIp8yf0C4zQ/viewform?usp=header",
      "SWLSconfig": {
    "ontologies": [
      "https://elsdvlee.github.io/rmlioresources/ontology.ttl"
    ],
      "completion": {
      "strict": [
        "http://semweb.mmlab.be/ns/rml#",
        "http://www.w3.org/ns/r2rml#"
      ]
    }
  },
  "examples": [
    {
      "label": "Simple JSON source",
      "mapping": "@prefix rr:   <http://www.w3.org/ns/r2rml#> .\n@prefix rml:  <http://semweb.mmlab.be/ns/rml#> .\n@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix ql:   <http://semweb.mmlab.be/ns/ql#> .\n@prefix map:  <http://mapping.example.com/> .\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n@prefix ex:   <http://example.com/> .\n\nmap:map_person_000\n    rml:logicalSource map:source_000 ;\n    rr:subjectMap [\n        rr:template \"http://example.com/{firstname}\"\n    ] ;\n    rr:predicateObjectMap [\n        rr:predicate rdf:type ;\n        rr:object foaf:Person\n    ], [\n        rr:predicate ex:name ;\n        rr:objectMap [\n            rml:reference \"firstname\" ;\n        ]\n    ] .\n\nmap:source_000\n    rml:source \"data.json\" ;\n    rml:referenceFormulation ql:JSONPath ;\n    rml:iterator \"$.persons[*]\" .\n",
      "data": [
        {
          "path": "data.json",
          "type": "json",
          "value": "{\n  \"persons\": [\n    {\"firstname\": \"John\", \"lastname\": \"Doe\"},\n    {\"firstname\": \"Jane\", \"lastname\": \"Smith\"},\n    {\"firstname\": \"Sarah\", \"lastname\": \"Bladinck\"}\n  ]\n}\n"
        }
      ]
    },
    {
      "label": "Combination of a JSON and a CSV source",
      "mapping": "@prefix rr:    <http://www.w3.org/ns/r2rml#> .\n@prefix rml:   <http://semweb.mmlab.be/ns/rml#> .\n@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix ql:    <http://semweb.mmlab.be/ns/ql#> .\n@prefix map:   <http://mapping.example.com/> .\n@prefix foaf:  <http://xmlns.com/foaf/0.1/> .\n@prefix schema: <http://schema.org/> .\n@prefix ex:    <http://example.com/> .\n\nmap:map_person_000\n    rml:logicalSource map:source_000 ;\n    rr:subjectMap [\n        rr:template \"http://example.com/person/{firstname}\"\n    ] ;\n    rr:predicateObjectMap [\n        rr:predicate rdf:type ;\n        rr:object foaf:Person ;\n    ], [\n        rr:predicate ex:name ;\n        rr:objectMap [\n\n            rml:reference \"firstname\" ;\n        ]\n    ], [\n\n        rr:predicate ex:likes ;\n        rr:objectMap [\n            rr:parentTriplesMap map:map_movie_000 ;\n            rr:joinCondition [\n                rr:child \"movie\" ;\n                rr:parent \"slug\" ;\n            ]\n        ]\n    ] .\n\nmap:map_movie_000\n\n    rml:logicalSource map:source_001 ;\n    rr:subjectMap [\n\n        rr:template \"http://example.com/movie/{slug}\"\n    ] ;\n    rr:predicateObjectMap [\n\n        rr:predicate rdf:type ;\n        rr:object schema:Movie ;\n    ], [\n\n        rr:predicate schema:name ;\n        rr:objectMap [\n\n            rml:reference \"title\" ;\n        ]\n    ], [\n\n        rr:predicate ex:year ;\n        rr:objectMap [\n\n            rml:reference \"year\" ;\n        ]\n    ] .\n\nmap:source_000 rml:iterator \"$.persons[*]\" ;\n    rml:referenceFormulation ql:JSONPath ;\n    rml:source \"persons.json\" .\n\nmap:source_001 rml:referenceFormulation ql:CSV ;\n    rml:source \"movies.csv\" .\n\n",
      "data": [
        {
          "path": "persons.json",
          "type": "json",
          "value": "{\n  \"persons\": [\n    {\n      \"firstname\": \"John\",\n      \"lastname\": \"Doe\",\n      \"movie\": \"wam\"\n    },\n    {\n      \"firstname\": \"Jane\",\n      \"lastname\": \"Smith\",\n      \"movie\": \"wam\"\n    },\n    {\n      \"firstname\": \"Sarah\",\n      \"lastname\": \"Bladinck\",\n      \"movie\": \"fotr\"\n    }\n  ]\n}\n"
        },
        {
          "path": "movies.csv",
          "type": "csv",
          "value": "slug,title,year\nsw,Star Wars,1977\nfotr,The Fellowship of the Ring,2001\nwam,We Are Marshall,2006\n"
        }
      ]
    }
  ]
}


global.matey.init("test-editor", config);
