# RML Playground

A browser-based editor for writing RML rules,
supported by the [Semantic Web Language Server](https://github.com/SemanticWebLanguageServer/swls) (SWLS).
The rules can be executed on a sample of the data,
which allows users to inspect the generated RDF data.
The generated RDF data can be exported for use outside of the RML Playground.

<!-- omit in toc -->
## Table of contents

* [Requirements](#requirements)
* [Installation](#installation)
* [Usage](#usage)
  * [Setting up the mapping engine API endpoint](#setting-up-the-mapping-engine-api-endpoint)
  * [Configuring the RML Playground](#configuring-the-rml-playground)
* [Additional configuration sets](#additional-configuration-sets)
* [Developing](#developing)
  * [Installation](#installation-1)
  * [Debugging](#debugging)
  * [Building](#building)
* [Run tests](#run-tests)
* [License](#license)

## Requirements

[Node.js](https://nodejs.org/en/download/)

## Installation

```shell
npm install
```

## Usage

### Setting up the mapping engine API endpoint

The RML Playground generates RDF data through a remote server.
For this, the RML Playground requires you to provide
a mapping engine endpoint.
You can either provide the URL of an existing server, or
set one up yourself by following
[these instructions](https://github.com/RMLio/rmlmapper-webapi-js).
The RML Playground can integrate mapping engines if they expose
an HTTP interface that adheres to the OpenAPI specification available at
[https://rml.io/api/playground/rmlmapper/](https://rml.io/api/playground/rmlmapper/).

Make sure that you provide the correct URL for the endpoint during [configuration](#configuring-the-rml-playground).

### Configuring the RML Playground

To configure RML Playground, create a configuration file `config.json` in the project root.
The configuration options are (all keys are optional unless noted):

- `"title"`: (string) Title displayed in the browser tab and as page header.
- `"logo"`: (string) "logo_kgc" or "logo_rmlio".
- `"surveyUrl"`: (string) URL used for the feedback / survey link in the UI.
- `"localStorageKey"`: (string) Stable key used to namespace persisted browser state
  (latest example) in localStorage. Use this to avoid collisions across different
  playground configurations sharing the same origin.
- `"RMLspecifications"`: (array of objects, optional) Array of RML specification objects,
  each with `url` and `label` properties.
- `"RMLengine"`: (object) Object containing RML mapping engine information:
  - `"url"`: (string) URL or documentation link for the RML engine.
  - `"label"`: (string) Display name for the RML engine.
  - `"webAPI"`: (string) URL of the RMLMapper Web API endpoint used to execute mappings.
- `"SWLSconfig"`: (Object) Settings for the Semantic Web Language Server:
  - `ontologies`: (array of strings) URLs of ontology resources
  - `shapes`: (array of strings) URLs of SHACL shape files
  - `prefix_disabled`: (array of strings) Prefixes of ontologies
    that must not be imported from [LOV](https://lov.linkeddata.es/dataset/lov/vocabs/)
  - `completion`: (object): Autocompletion settings with two keys:
    - `strict`: (array of strings): URLs of namespaces requiring strict autocompletion (respecting the defined domain)
    - `loose`: (array of strings): URLs of namespaces requiring loose autocompletion
- `"examples"`: (array of objects) Example objects used to populate the examples dropdown.
  Each example is a JSON object describing the mapping, input data, and metadata.

Notes:
- The file `config.json` is git-ignored. If you do not provide one, the build scripts copy `config-default.json` into place.
- You can add more logos in `./lib/resources`, with updates in `./lib/front.js`.

Additional configuration sets
-----------------------------

You can maintain multiple configuration sets under the `configs/` folder.
Each configuration should be placed in its own subdirectory and contain a `config.json`
with an additional key `exampleDirs` that lists the relative paths to example
subfolders inside that subdirectory, containing:

- `metadata.json` — metadata file with `id`, `label`,  `mapping` (filename), and `data` (array of file objects)
- a mapping file — referenced in `metadata.json`
- data files — referenced in `metadata.json`

```
configs/
  config1/
    config.json
    examples/
      example1/ 
        input1.json
        mapping.ttl
        metadata.json
  config2/
    config.json
    examples/
      example1/ 
        input1.json
        mapping.ttl
        metadata.json
      example2/ 
        input1.csv
        mapping.ttl
        metadata.json
```

To activate one of these configurations, run the helper script:

```bash
node scripts/select-config.cjs <config-name>
# example
node scripts/select-config.cjs rmlio
```

This script will add the examples from the subfolders to the selected `config.json`,
before placing the config in the root of this repository.


## Developing

### Installation

Install dependencies via

   ```shell
   npm install
   ```

### Debugging

1. Build for debugging and spin up an HTTP server via

   ```shell
   npm run dev
   ```

2. Open <http://localhost:5173> in the browser.

### Building

Build a minimized version into `./dist`:

   ```shell
   npm run build
   ```

## Run tests

NOTE: the tests are temporarily disabled.

Run the following commands from inside the project directory:

```shell
npm install
# for CI/CD, assuming that an RMLMapper endpoint with URL <https://rml.io/api/rmlmapper/execute> is up and running:
npm test
# for local testing, assuming that an RMLMapper endpoint with URL <http://localhost:4000/execute> is up and running:
npm run test-local
```

## License

This code is copyrighted by [Ghent University – imec](http://knows.idlab.ugent.be/) and
released under the [MIT license](http://opensource.org/licenses/MIT).
