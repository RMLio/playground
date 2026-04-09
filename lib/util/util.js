import ttlRead from "@graphy/content.ttl.read";
import rdfTree from "@graphy/memory.dataset.fast";
import ttlWrite from "@graphy/content.ttl.write";
import { Parser } from "n3";

/**
 * Makes text with RDF triples prettier
 * @param {String} rdf - unprettified RDF
 * @returns {Promise} promise of prettified RDF
 */
export function prettifyRDF(rdf) {
  return new Promise(function (resolve, reject) {
    let prettyRdf = '';
    ttlRead(rdf)
      .pipe(rdfTree())
      .pipe(ttlWrite())
      .on('data', data => prettyRdf += data)
      .on('end', () => resolve(prettyRdf))
      .on('error', (e) => reject(e));
  });
}

/**
 * Fetch a remote source with given URL asynchronously and return promise of fetched data
 * @param {String} url - of remote source
 * @returns {Promise} promise containing fetched value if resolved
 */
export function loadRemote(url) {
  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.open('GET', url);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(xhr.responseText);
        }
      }
    };
    xhr.send();
  });
}

/**
 * Downloads the given text as a file with the given type and name.
 * @param {String} text - string that serves as content for file
 * @param {String} fileType - Specifies type of text for file. Can be 'json', 'text' or 'text/turtle'
 * @param {String} fileName - name of file to be downloaded
 */
export function downloadString(text, fileType, fileName) {
  const blob = new Blob([text], {type: fileType});
  const a = document.createElement('a');

  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(function () {
    URL.revokeObjectURL(a.href);
  }, 1500);
}

/**
 * Promisified writer.end()
 * @param {Object} writer - an N3 Writer
 * @returns {Promise} promise containing result if resolved
 */
export function writerEndAsync(writer) {
  return new Promise((resolve, reject) => {
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Promisified parser.parse()
 * @param {Object} parser - an N3 Parser
 * @param {String} input - input to be parsed
 * @returns {Promise} promise containing quads if resolved
 */
export function parseRdfAsync(parser, input) {
  return new Promise((resolve, reject) => {
    const quads = [];
    parser.parse(input, (err, quad) => {
      if (err) {
        reject(err);
      } else if (quad) {
        quads.push(quad);
      } else {
        resolve(quads);
      }
    });
  });
}

/**
 * Returns the entries of an object sorted by key
 * @param {*} obj 
 * @returns 
 */
export function sortedEntries(obj) {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Converts RML rules into quads.
 * @param {String} rmlInput - RML rules in Turtle format
 * @returns {Array} array containing generated RDF quads
 * @throws {ParseException} exception that gets thrown when input is invalid
 */
export function convertRMLtoQuads(rmlInput) {
  const parser = new Parser();
  return parser.parse(rmlInput);
}

export function importResourceUrl(resourcePath) {
  return new URL(`${resourcePath}`, import.meta.url).href
}

/**
 * Encodes a share payload into a URL-safe base64 string.
 * @param {Object} payload - payload containing mapping and data sources
 * @returns {String|null} URL-safe base64 string or null when encoding fails
 */
export function encodeSharePayload(payload) {
  try {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = "";

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  } catch (e) {
    return null;
  }
}

/**
 * Decodes a URL-safe base64 share payload.
 * @param {String} encodedPayload - URL-safe base64 payload
 * @returns {Object|null} decoded payload object, or null if invalid
 */
export function decodeSharePayload(encodedPayload) {
  try {
    if (!encodedPayload || typeof encodedPayload !== "string") {
      return null;
    }

    const base64 = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padding = base64.length % 4;
    const padded = padding ? `${base64}${"=".repeat(4 - padding)}` : base64;

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}
