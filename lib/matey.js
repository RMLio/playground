import 'popper.js';
import 'bootstrap';
import 'brace';
import 'brace/theme/monokai';
import 'brace/mode/yaml';
import 'brace/mode/turtle';
import 'brace/mode/json';
import 'brace/mode/text';
import 'brace/mode/xml';
import { Writer, Parser } from "n3";

import Persister from "./util/persister";
import { prettifyRDF, loadRemote, writerEndAsync, parseRdfAsync, sortedEntries, convertRMLtoQuads, encodeSharePayload, decodeSharePayload } from "./util/util";
import logger from "./logger";
import Front from './front';
import EditorManager from './editor-manager';
import MapperHandler from './mapper-handler';
import '../assets/css/style.css';

/**
 * Class for adding/manipulating Matey content in web page
 */
class Matey {

  constructor() {

    // create persister
    this.persister = new Persister();

    this.logger = logger;
    this.editorManager = new EditorManager(this);
    this.front = new Front(this);

    // An identifier for stateful functions performed during RML mappings, e.g., LDES generation.
    // When invoked from a browser it is the timestamp of refreshing the page, so as long as
    // the user doesn't reload the page, this id remains the same and the state is not reset.
    this.functionStateId = new Date().getTime().toString();
  }

  /**
   * Initializes all of the Matey content in <div> element with given id
   * @param {String} id - id of <div> element into which HTML code with Matey content should be inserted
   * @param {Object} config - object with user configuration
   */
  async init(id, config) {

    this.id = id;
    this.config = config;
    this.latestExampleStorageKey = this.getLatestExampleStorageKey(config);

    // check if RMLengine.webAPI is set in config
    if (config.RMLengine && config.RMLengine.webAPI) {
      this.mapperHandler = this.mapperHandler || new MapperHandler(config.RMLengine.webAPI, this.logger);
    } else {
      throw new Error("No RMLMapper URL specified. Make sure the 'RMLengine.webAPI' property is set in the configuration object.");
    }

    // read Matey examples from the config
    this.mateyExamples = config.examples;

    // warn logger that page has been visited
    this.logger.warn('page_visit');

    // initialize the front-end
    this.front.init(config);

    // initialize the EditorManager
    await this.editorManager.init(config);

    // load examples from config.examples (array of example paths)
    this.front.loadExamples(this.mateyExamples);

    // URL-shared examples have priority over persisted/default state.
    if (this.loadSharedExampleFromUrl()) {
      return;
    }

    // load the last stored example for this config, if any
    const storedExample = this.persister.get(this.latestExampleStorageKey);
    if (storedExample) {
      this.front.doAlert(`Loaded previous state from LocalStorage`, 'info', 10000);
      this.loadExample(storedExample);
      this.front.displayExample('');
      this.logger.info('stored_example_loaded');
    } else {
      const mateyExample = this.mateyExamples.length ? this.mateyExamples[0] : null;
      if (mateyExample) {
        this.loadExample(mateyExample);
        this.front.displayExample(mateyExample.label);
        this.logger.info('example_loaded');
      } else {
        this.logger.info('no example loaded');
      }
    }
  }

  /**
   * This function "clears" the state by assigning a new timestamp to `functionStateId`.
   * This way RMLMapper Web API uses a new (clean) state when calling `toRML()` the next time.
   */
  clearAll() {
    this.editorManager.clearAll();
    this.functionStateId = new Date().getTime().toString();
    this.front.doAlert('Everything cleared!', 'success');
  }

  /**
   * Fetch a remote data source, and use it to create a new data editor. Displays alert if fetching fails.
   * @param {String} url - url of the remote data source
   * @param {String} dataPath - path that data source will have once it's loaded in
   * @returns {Promise<String>} promise that holds data source if fetch successful
   */
  loadRemoteDataSource(url, dataPath) {
    return loadRemote(url)
      .then(dataValue => {
        this.editorManager.createAndOpenDataEditor(dataPath, dataValue);
      })
      .catch(e => {
        this.logger.error('data_loading_error', e);
        this.front.doAlert('Could not load remote data source.', 'danger', 5000);
      })
  }

  /**
   * Fetch mapping rules from remote source and set mapping editor's value to them. Displays alert if fetching fails.
   * @param {String} url - url of remote rules
   * @returns {Promise<String>} promise that holds data source if fetch successful
   */
  loadRemoteMapping(url) {
    return loadRemote(url)
      .then(rules => {
        this.editorManager.setInputMapping(rules);
      })
      .catch(e => {
        this.logger.error('mapping_loading_error', e);
        this.front.doAlert('Could not load remote mapping rules.', 'danger', 5000);
      })
  }

  /**
   *  Generates RDF quads based on input data and mapping rules
   *  @returns {Promise<void>} promise that resolves if RDF was successfully generated, and rejects otherwise
   */
  async runMappingRemote() {
    let mappingInput = null;
    let outputButtonTextSuffix = "RDF output";
    let quads;

    try {
      // Reset outputs
      this.editorManager.destroyOutputEditors();

      mappingInput = this.editorManager.getInputMapping();
      quads = convertRMLtoQuads(mappingInput);

      if (!quads) {
        return;
      }

      // Serialize RML with N3.Writer
      const writer = new Writer();
      writer.addQuads(quads);

      let rmlDoc;
      try {
        rmlDoc = await writerEndAsync(writer);
      } catch (err) {
        this.logger.error("Something went wrong when converting with N3 writer.", err);
        return;
      }

      const sources = this.editorManager.getSources();
      const data = await this.mapperHandler.executeMapping(rmlDoc, sources);
      const output = this.editorManager.getOutput();

      // Handle single output
      if (typeof data.output === 'string') {
        const parser = new Parser();
        const outWriter = new Writer({ format: 'turtle', prefixes: {} });

        let parsedQuads;
        try {
          parsedQuads = await parseRdfAsync(parser, data.output);
        } catch (err) {
          this.logger.error('rdf_parse_failed', err);
          return;
        }

        parsedQuads.forEach(q => outWriter.addQuad(q));

        let outTtl;
        try {
          outTtl = await writerEndAsync(outWriter);
        } catch (err) {
          this.logger.error('ttl_write_failed', err);
          return;
        }

        try {
          outTtl = await prettifyRDF(outTtl);
        } catch (e) {
          this.logger.error('prettify_failed', e);
        }

        const outputEditor = this.editorManager.createOutputEditor({ path: 'output', type: 'text', value: outTtl }, 'RDF output', 0);
        outputEditor.dropdownA.click();
        this.front.setOutputButtonDivText(`1 ${outputButtonTextSuffix}`);
        this.front.doAlert('Output updated!', 'success');

        const persistData = output.map(out => ({
          path: out.path,
          type: out.type,
          value: out.data
        }));

        this.persister.set(this.latestExampleStorageKey, {
          label: 'latest',
          icon: 'user',
          mapping: mappingInput,
          data: persistData
        });

        return;
      }

      // Handle multiple outputs
      const persistData = output.map(out => ({
        path: out.path,
        type: out.type,
        value: out.data
      }));

      this.persister.set(this.latestExampleStorageKey, {
        label: 'latest',
        icon: 'user',
        mapping: mappingInput,
        data: persistData
      });

      for (const [file, content] of sortedEntries(data.output)) {
        const outputEditor =
          this.editorManager.createOutputEditor({ path: file, type: 'text', value: content }, 'RDF output');
        if (content !== '') {
          outputEditor.dropdownA.click();
        }
      }

      this.front.setOutputButtonDivText(`${Object.keys(data.output).length} ${outputButtonTextSuffix.split('output').join('outputs')}`);
      this.front.doAlert('Output updated!', 'success');

    } catch (err) {
      this.logger.error('mapping_invalid', { mapping: mappingInput });
      this.logger.error('ld_generation_error', err);
      if (err && typeof err === 'object') {
        this.front.doAlert(err, 'danger', -1, 'Could not generate Linked Data.');
      } else {
        this.front.doAlert(err.toString(), 'danger', -1, 'Could not generate Linked Data.');
      }
    }
  }



  /**
   * Retrieves the Linked Data content from the Turtle/TriG editors
   * @returns {Array} text inside Turtle/TriG editors
   */
  getLD() {
    return this.editorManager.getLD();
  }

  /**
   * Retrieves the RML mapping rules from the mapping editor
   * @returns {String} text inside mapping editor
   */
  getMapping() {
    return this.editorManager.getInputMapping();
  }

  /**
   * Retrieves the data from the currently active data editor
   * @returns {String} text inside active data editor
   */
  getData() {
    return this.editorManager.getData();
  }

  /**
   * Loads in given example into input editors
   * @param example - example to be loaded in
   * @param reset - Determines the cursor position after example texts are inserted. If true, all text will
   *        be selected in both input editors. If false, the cursor will move to the top in both input editors.
   */
  loadExample(example, reset = false) {
    this.editorManager.loadExample(example, reset);
  }

  /**
   * Returns the localStorage key used for persisted "latest example" state.
   * Namespaced by config so different playground instances do not overwrite each other.
   * @param {Object} [config=this.config] - active playground config
   * @returns {String} localStorage key
   */
  getLatestExampleStorageKey(config = this.config) {
    const rawNamespace =
      (config && (config.localStorageKey || config.title)) ||
      'default';

    const namespace = String(rawNamespace).trim().toLowerCase() || 'default';
    return `latestExample:${namespace}`;
  }

  /**
   * Loads an example by its label
   * @param {String} label - the label of the example to load
   * @param {Boolean} [reset=false] - determines the cursor position after example texts are inserted.
   *        If true, all text will be selected in both input editors. If false, the cursor will move to the top.
   */
  loadExampleByLabel(label, reset = false) {
    if (label) {
      const example = this.mateyExamples.find(ex => ex.label === label);
      if (example) {
        this.loadExample(example, reset);
      } else {
        this.front.doAlert(`Example with label ${label} not found!`, 'danger');
      }
    }
  }

  /**
   * Retrieves the current state of all input editors (mapping and data sources)
   * @returns {Object} object with 'mapping' and 'data' properties representing the current input state
   */
  getCurrentInputState() {
    return {
      mapping: this.editorManager.getInputMapping(),
      data: this.editorManager.getOutput().map((source) => ({
        path: source.path,
        type: source.type,
        value: source.data,
      })),
    };
  }

  /**
   * Builds a shareable URL containing the current input state (mapping and data)
   * @returns {String} shareable URL with encoded example data as a query parameter
   * @throws {Error} if the share payload cannot be encoded
   */
  buildShareableUrl() {
    const payload = this.getCurrentInputState();
    const encodedPayload = encodeSharePayload(payload);

    if (!encodedPayload) {
      throw new Error('Could not encode share payload.');
    }

    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('example', encodedPayload);
    return shareUrl.toString();
  }

  /**
   * Builds a shareable URL and copies it to the user's clipboard
   * Falls back to displaying a prompt if clipboard access is not available.
   * Shows an alert message to indicate success or failure.
   * @returns {Promise<void>}
   */
  async copyShareableUrl() {
    try {
      const shareUrl = this.buildShareableUrl();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        this.front.doAlert('Share URL copied to clipboard.', 'success', 4000);
      } else {
        window.prompt('Copy this share URL:', shareUrl);
      }
    } catch (e) {
      this.logger.error('share_url_creation_error', e);
      this.front.doAlert('Could not create a share URL.', 'danger', 5000);
    }
  }

  /**
   * Extracts and decodes a shared example from the URL query parameters
   * Validates the decoded data structure and filters out invalid entries.
   * @param {String} [search=window.location.search] - URL search parameters to parse
   * @returns {Object|null} decoded example object with 'label', 'mapping', and 'data' properties, or null if not found or invalid
   */
  getSharedExampleFromUrl(search = window.location.search) {
    const params = new URLSearchParams(search);
    const encodedExample = params.get('example');

    if (!encodedExample) {
      return null;
    }

    const decoded = decodeSharePayload(encodedExample);
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    if (typeof decoded.mapping !== 'string' || !Array.isArray(decoded.data)) {
      return null;
    }

    const data = decoded.data
      .filter(item => item && typeof item.path === 'string' && typeof item.value === 'string')
      .map(item => ({
        path: item.path,
        value: item.value,
        type: item.type || (item.path.endsWith('.json') ? 'json' : 'text'),
      }));

    if (!data.length) {
      return null;
    }

    return {
      label: 'shared',
      mapping: decoded.mapping,
      data,
    };
  }

  /**
   * Loads a shared example from the URL query parameters into the input editors
   * Handles errors gracefully with appropriate user alerts and logging.
   * @returns {Boolean} true if a shared example was successfully loaded, false otherwise
   */
  loadSharedExampleFromUrl() {
    try {
      const sharedExample = this.getSharedExampleFromUrl();
      if (!sharedExample) {
        return false;
      }

      this.loadExample(sharedExample);
      this.front.displayExample('');
      this.front.doAlert('Loaded shared example from URL.', 'info', 10000);
      this.logger.info('shared_example_loaded');
      return true;
    } catch (e) {
      this.logger.error('shared_example_loading_error', e);
      this.front.doAlert('Could not load shared example from URL.', 'warning', 8000);
      return false;
    }
  }
}

export default Matey;
