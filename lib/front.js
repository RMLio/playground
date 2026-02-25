import { compile } from "handlebars";
import $ from "jquery";
import { downloadString } from "./util/util";
// read URIs for images needed in HTML body which will be inserted into HTML template
import img22url from "../assets/img/22.png";
import img31url from "../assets/img/31.png";
// read HTML template from matey.html
import mateyHtmlSource from "../assets/html/matey.html?raw";
import alertHtmlSource from "../assets/html/alert.html?raw";
import logo_rmlio from "./resources/logo_rmlio.png";
import logo_kgc from "./resources/logo_kgc.png";
/**
 * Class for manipulating the Matey UI in the web page
 */

export default class Front {

  constructor(matey) {
    this.matey = matey;
    this.persister = matey.persister;
  }

  /**
   * Initialize the UI for the data editor
   */
  init(config) {
    // Set document title from config
    if (config && config.title) {
      document.title = config.title;
    }

    const availableLogos = {
      'logo_rmlio': logo_rmlio,
      'logo_kgc': logo_kgc
    };  
    let logo = logo_rmlio; // default logo
    if (config.logo && availableLogos[config.logo]) {
      console.log
      logo = availableLogos[config.logo];
    } 

    // Resolve survey URL from config (if present), fallback to existing Google Forms link
    const defaultSurveyUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScoWl8ssl_2cDJ3W1WSGL4vQthQsyVRaAnMx3_8XHCRUJuGjQ/viewform?usp=sf_link';
    let surveyUrl = defaultSurveyUrl;
    if (config && config.surveyUrl) {
      try {
        surveyUrl = new URL(config.surveyUrl, window.location.origin).toString();
      } catch (e) {
        surveyUrl = config.surveyUrl;
      }
    }

    // format RML specifications as HTML links
    let rmlSpecificationsHtml = '';
    if (config && config.RMLspecifications && Array.isArray(config.RMLspecifications)) {
      const specLinks = config.RMLspecifications.map(spec => 
        `<a href="${spec.url}" target="_blank">${spec.label}</a>`
      );
      rmlSpecificationsHtml = specLinks.join(', ');
    }

    // format RML engine info as HTML
    let rmlEngineHtml = '';
    if (config && config.RMLengine) {
      rmlEngineHtml = `<a href="${config.RMLengine.url}" target="_blank">${config.RMLengine.label}</a>`;
    }

    // image URIs
    const htmlTmpl = compile(mateyHtmlSource);
    const html = htmlTmpl({
      title: config && config.title ? config.title : '',
      logo: logo,
      surveyUrl,
      RMLspecifications: rmlSpecificationsHtml,
      RMLengine: rmlEngineHtml,
      img22url: img22url,
      img31url: img31url
    });

    // insert HTML content into page, but first check that container exists
    const container = $("#" + this.matey.id);
    if (!container.length) {
      throw new Error(`Matey container #${this.matey.id} not found`);
    }
    container.html(html);

    // initialize Input and Delete button for data editor
    this.$inputButtonDiv = $('#input-button-matey');
    this.$deleteButtonSpan = $('#data-source-delete-matey');

    // initialize output button
    this.$outputButtonDiv = $('#output-button-matey');

    this.$deleteButtonSpan.find('button').on('click', (e) => {
      e.stopPropagation();
      matey.editorManager.deleteDataEditor($(e.target).data('delete-editor-id'));
    });


    // bind buttons for generating LD and RML to corresponding functions
    document.getElementById("clear-btn-matey").onclick = this.matey.clearAll.bind(this.matey);
    document.getElementById("ld-btn-matey").onclick = this.matey.runMappingRemote.bind(this.matey);

    // bind button for creating new data source to corresponding function
    $('#data-create-matey').on('click', () => {
      const dataPath = prompt("Create a new data path", "source_" + this.matey.editorManager.getNumberOfDataEditors() + '.csv');

      if (dataPath !== null) {
        // create a new, empty data editor and set it as the active one
        this.matey.editorManager.createAndOpenDataEditor(dataPath, '');
      }
    });

    // bind button for loading remote data source to corresponding function
    $('#data-load-matey').on('click', () => {
      const url = prompt("Enter data source URL");
      const dataPath = prompt("Create a new data path", "source_" + this.matey.editorManager.getNumberOfDataEditors() + '.csv');

      if (url !== null && dataPath !== null) {
        this.matey.loadRemoteDataSource(url, dataPath);
      }
    });

    // bind button for loading remote mapping rules to corresponding function
    $('#mapping-load-matey').on('click', () => {
      const url = prompt("Enter mapping rules URL");

      if (url !== null) {
        this.matey.loadRemoteMapping(url);
      }
    });

    // bind download buttons to their corresponding functions
    $('#data-dl-matey').on('click', () => {
      const activeEditor = this.matey.editorManager.getActiveDataEditor();

      downloadString(activeEditor.editor.getValue(), activeEditor.type, activeEditor.path);
    });

    $('#mapping-dl-matey').on('click', () => {
      downloadString(this.matey.editorManager.getMapping(), 'text', 'mapping.ttl');
    });

    $('#turtle-dl-matey').on('click', () => {
      const activeEditor = this.matey.editorManager.getActiveOutputEditor();
      console.log(activeEditor)

      downloadString(activeEditor.editor.getValue(), 'text', activeEditor.path);
    });
  }

  /**
   * Places the editors in a certain arrangement, specified by given layout
   * @param {String} layout - specifies the layout in which editors should be arranged
   */
  updateLayout(layout) {
    const inputDiv = $('#div-input-data-matey');
    const mappingDiv = $('#div-mapping-matey');
    const outputDiv = $('#div-output-data-matey');
    const btn22 = $('#layout-22-matey');
    const btn31 = $('#layout-31-matey');

    switch (layout) {
      case '2x2':
        inputDiv.attr('class', 'col-md-6');
        mappingDiv.attr('class', 'col-md-6');
        outputDiv.attr('class', 'col-md-12');
        btn22.hide();
        btn31.show();
        this.persister.set('layout', '2x2');
        break;
      default:
        inputDiv.attr('class', 'col-md-4');
        mappingDiv.attr('class', 'col-md-4');
        outputDiv.attr('class', 'col-md-12');
        btn22.show();
        btn31.hide();
        this.persister.set('layout', '3x1');
        break;
    }
  }

  /**
   * Fills the HTML select element and configures the button to load examples, discarding any previous configuration.
   * @param {Array} examples - examples to be loaded
   */
  loadExamples(examples) {
    const $exampleButton = $('#example-btn-matey');
    const $el = $('#examples-matey');

    $exampleButton.off('click');
    $el.empty();
    examples.forEach((example) => {
      const $option = $('<option value="' + example.label + '">' + (example.icon ? '<span class="icon-' + example.icon + '"></span>' : '') + '&nbsp;' + example.label + '</option>');
      $el.append($option);
    });
    // to represent the latest saved state, add an empty option
    $el.append($('<option value=""></option>'));

    $exampleButton.on('click', () => {
      const selectedLabel = $el.val();
      if (selectedLabel) {
        this.matey.loadExampleByLabel(selectedLabel, true);
      } else {
        this.doAlert('Please select a named example...', 'success');
      }
    });
  }

  /**
   * Sets the displayed example in the HTML select element.
   * @param {String} label - the label of the example to display
   */
  displayExample(label) {
    const $el = $('#examples-matey');
    const labels = $el.find('option').map((i, el) => $(el).val()).get();

    if (!labels.includes(label)) {
      label = '';
    } 
    $el.val(label);
  }

  /**
   * Updates the delete button for data editors. If there are no data editors, the button will be hidden, else
   * the button is shown and will store in it the id of the data editor that should be deleted when the button is pressed.
   * @param id - id of the data editor corresponding to the delete button
   */
  updateDeleteButton(id) {
    if (this.matey.editorManager.getNumberOfDataEditors() === 0) {
      this.$deleteButtonSpan.hide();
    } else {
      this.$deleteButtonSpan.show();
      this.$deleteButtonSpan.find('button').data('delete-editor-id', id);
    }
  }

  /**
   * Creates the UI components for a new Ace Editor
   * @param {String} path - path of the data in data editor
   * @param {number} index - identifier for data editor element
   * * @param {String}  value - of the data in data editor
   * @returns {{
   *   elem:      (jQuery|HTMLElement) element containing the ace editor,
   *   input:     (jQuery|HTMLElement) element containing button for data editor,
   *   dropdownA: (jQuery|HTMLElement) element containing dropdown for data editor,
   * }}
   */
  createDataEditor(path, index, value) {
    const $dropdownA = $(`<a class="dropdown-item rounded-0" data-toggle="tab" id="dataeditor-link-${index}" href="#dataeditor-${index}">${path}</a>`);
    $('#dropdown-data-chooser-matey').append($dropdownA);

    const $dataValue = $(`<div class="ace-editor tab-pane" data-matey-label="${path}" id="dataeditor-${index}"><pre><code>${value}</code></pre></div>`);
    $('#data-matey').append($dataValue);

    const inputButton = $(`<span>Input: ${path}</span>`);

    $dropdownA.on('click', e => {
      this.$inputButtonDiv.html(inputButton);
      this.updateDeleteButton(index);
      this.$inputButtonDiv.text($(`Input: ${path}`));

      e.preventDefault();
      $dropdownA.tab('show');
    });

    return {
      elem: $dataValue,
      input: inputButton,
      dropdownA: $dropdownA,
    }
  }

  /**
   * Removes the data editor UI.
   * @param index - index of data editor that must to be deleted
   */
  deleteDataEditor(index) {
    this.$inputButtonDiv.html('Input: Data sources');
    this.updateDeleteButton(null);
  }

  /**
   * Creates an HTML element for an alert message and displays it in the page for a certain time period
   * @param message - the alert message to be displayed
   * @param type - of alert
   * @param timeout - how long alert has to stay open (in milliseconds; -1 means forever)
   * @param heading - optional text to be displayed as the alert's heading
   */
  doAlert(message, type = 'primary', timeout = 2000, heading = '') {

    // preformat the message to preserve spaces and line breaks
    const escapeHtml = (str) =>
      str.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c]));

    let formattedMessage = "";

    // Pretty formatting if message is an object
    if (typeof message === "object" && message !== null && !(message instanceof Error)) {
      /*formattedMessage = Object.entries(message)
        .map(([key, value]) => {
          const safeKey = escapeHtml(String(key));
          const safeValue = escapeHtml(String(value));
          return `
          <div style="margin-bottom: 6px;">
            <strong style="display:block; margin-bottom:2px;">${safeKey}</strong>
            <span style="white-space: pre-wrap;">${safeValue}</span>
          </div>`;
        })
        .join("");*/
      // Extract only the fields we care about
      const msgText = message.message ?? '';   
      const logText = message.log;

      // Build the UI:
      // 1) message directly under the title
      // 2) optional "Mapping Engine Log" subtitle + code block
      const parts = [];

      if (msgText != null && msgText !== '') {
        parts.push(
          `<div class="engine-message" style="margin-bottom: 6px;">
           <span style="white-space: pre-wrap;">${escapeHtml(String(msgText))}</span>
         </div>`
        );
      }

      if (logText != null && logText !== '') {
        parts.push(
          `<div class="engine-log">
           <strong style="display:block; margin-bottom: 4px;">Mapping Engine Log</strong>
           <span style="white-space: pre-wrap;"><code>${escapeHtml(String(logText))}</code></span>
         </div>`
        );
      }

      // If neither key exists, fall back to a safe stringified view of the object
      if (parts.length === 0) {
        parts.push(
          `<span style="white-space: pre-wrap;">${escapeHtml(String(message))}</span>`
        );
      }

      formattedMessage = parts.join('');
    } else {
      formattedMessage = `<span style="white-space: pre-wrap;">${escapeHtml(String(message))}</span>`;
    }

    const htmlTmpl = compile(
      alertHtmlSource.replace('{{message}}', formattedMessage)
    );

    const html = htmlTmpl({ type, heading });
    const $alert = $(html);

    $('#alerts-matey').append($alert);

    if (timeout >= 0) {
      setTimeout(() => $alert.alert('close'), timeout);
    }
  }

  /**
   * Resets content of data editors
   */
  destroyDataEditors() {
    $('#data-matey').html('');
    $('#dropdown-data-chooser-matey').html('');
  }

  /**
   * Resets content of output editors
   */
  destroyOutputEditors() {
    this.$outputButtonDiv.text('Output: Generated RDF');
    $('#output-matey').html('');
    $('#dropdown-out-chooser-matey').html('');
  }

  /**
   * Set the text of the output button
   * @param {String} text - text to be placed in the button
   */
  setOutputButtonDivText(text) {
    this.$outputButtonDiv.text(text);
  }

  /**
   * Create an input button for a certain datasource
   * @param {Object} dataPart - object that contains path of the datasource
   * @returns {HTMLElement} HTML element containing the button.
   */
  createInputButton(dataPart) {
    return $(`<span>Input: ${dataPart.path}</span>`);
  }

  /**
   * Creates and initializes ui for an abstract ace editor
   * @param {Object} dataPart - object that contains value, type and path of data in data editor
   * @param {String} dataType - type of the data to show, for example: RDF output, RML Mapping, etc.
   * @param {number} index - identifier for data editor element
   * @param selectValue - determines cursor position after new value is set. `undefined` or null is selectAll, -1 is at the document start, and 1 is at the end
   * @param {String} prefix - prefix for he id's
   * @param {String} divId - id of the div to add the editor to
   * @param {String} dropdownId - id op the dropdown for the selector for this editor
   * @returns {{
   *   elem:      (jQuery|HTMLElement) element containing the ace editor,
   *   input:     (jQuery|HTMLElement) element containing button for data editor,
   *   dropdownA: (jQuery|HTMLElement) element containing dropdown for data editor,
   * }}
   */
  createAbstractEditor(dataPart, dataType, index, selectValue = null, prefix, divId, dropdownId) {
    this.rmlEditorClass = '';

    if (dataType == 'RML mapping') {
      this.rmlEditorClass = 'rml-editor';
    }

    const $dropdownA = $(`<a class="dropdown-item rounded-0" data-toggle="tab" id="${prefix}-link-${index}" href="#${prefix}-${index}">${dataType}: ${dataPart.path}</a>`);
    $(`#${dropdownId}`).append($dropdownA);
    const $dataValue = $(`<div class="ace-editor tab-pane ${this.rmlEditorClass}" data-matey-label="${dataPart.path}" id="${prefix}-${index}"><pre><code>${dataPart.value}</code></pre></div>`);
    $(`#${divId}`).append($dataValue);
    const input = this.createInputButton(dataPart);

    $dropdownA.on('click', e => {
      this.updateDeleteButton(index);
      e.preventDefault();
      $dropdownA.tab('show');
    });

    return {
      elem: $dataValue,
      input,
      dropdownA: $dropdownA,
    }
  }
}
