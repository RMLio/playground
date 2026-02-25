/**
 * Class for handling mapping engine interaction
 */
class MapperHandler {

  /**
   * Constructor
   * @param {String} url - URL of the mapping engine(s) endpoint
   * @param {Logger} logger 
   */
  constructor(url, logger) {
    this.url = url; 
    this.logger = logger;
  }

  /**
   * Executes mapping by sending RML to mapping engine
   * @param {String} rmlDoc - RML document as string
   * @param {Array} sources - array of source objects { name: string, content: string }
   * @param {String} engine - identifies the engine to use (if not given, RMLMapper is used)
   * @returns {Promise<Object>} promise that resolves to mapping engine response
   */
  async executeMapping(rmlDoc, sources, engine = null) {
    try {
      const body = {
        rml: rmlDoc,
        functionStateId: this.functionStateId,
        sources
      };
      if (engine) {
        body.engine = engine;
      }

      let response;
      try {
        response = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } catch (e) {
        this.logger.error('mapper_post_failed', { error: e });
        throw new Error(`POST to mapping engine failed. Is it online at ${this.url}?`);
      }

      // assume response is JSON, even in case of error
      let data;
      try {
        data = await response.json();
      } catch (e) {
        this.logger.error('mapper_response_not_json', { status: response.status });
        throw new Error(`The mapping engine response status code is ${response.status} and the body is not in JSON format.`);  
      }
      this.logger.info(`rmlMapper response: ${JSON.stringify(data, null, 2)}`);

      if (!response.ok) {
        this.logger.error('mapper_response_not_ok', { status: response.status });
        // throw new Error(`The mapping engine response status code is ${response.status} and the body is:\n${JSON.stringify(data, null, 2)}`); 
        // Preserve structure for upper layers: throw the raw object if possible
        // Fallback to a simple object if not an object
        if (data && typeof data === 'object') {
          throw data;                               
        } else {
          throw {                                   
            status: response.status,
            error: String(data)
          };
        }
      }

      return data;

    } catch (err) {

      const alertPayload =
        err && typeof err === 'object'
          ? err
          : { error: String(err) };

      this.logger.error('ld_generation_error', alertPayload);
      throw err;
    }
  }
}

export default MapperHandler;
