'use strict';

import Matey from '../lib/matey';

describe('shareable URL support', function () {
  beforeEach(() => {
    localStorage.clear();
    history.pushState({}, '', '/');
  });

  it('should generate a URL that can be decoded back into mapping and data', function () {
    expect.assertions(5);

    matey.clearAll();
    matey.editorManager.createAndOpenDataEditor('shared.json', '{"hello":"world"}');
    matey.editorManager.setInputMapping('@prefix ex: <http://example.com/> .\n');

    const shareUrl = matey.buildShareableUrl();
    const url = new URL(shareUrl);
    const decoded = matey.getSharedExampleFromUrl(url.search);

    expect(url.searchParams.has('example')).toBe(true);
    expect(decoded).not.toBeNull();
    expect(decoded.mapping).toContain('@prefix ex: <http://example.com/> .');
    expect(decoded.data.length).toBe(1);
    expect(decoded.data[0].path).toBe('shared.json');
  });

  it('should load shared example from URL during init before defaults', async function () {
    expect.assertions(3);

    const payload = {
      mapping: '@prefix ex: <http://example.com/> .\n',
      data: [
        {
          path: 'shared.csv',
          type: 'csv',
          value: 'id,name\n1,Alice\n'
        }
      ]
    };

    const encoded = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    history.pushState({}, '', `/?example=${encoded}`);
    document.body.innerHTML = '<div id="share-url-test-editor"></div>';

    const myMatey = new Matey();
    const config = {
      title: 'Share URL test',
      logo: 'logo_rmlio',
      RMLengine: {
        url: '',
        label: 'RML mapper',
        webAPI: 'http://localhost:4000/execute'
      },
      examples: [
        {
          label: 'default',
          mapping: '@prefix default: <http://default/> .\n',
          data: [
            {
              path: 'default.json',
              type: 'json',
              value: '{"default":true}'
            }
          ]
        }
      ]
    };

    await myMatey.init('share-url-test-editor', config);

    expect(myMatey.getMapping()).toContain('@prefix ex: <http://example.com/> .');
    expect(myMatey.getData()).toContain('id,name');
    expect(myMatey.editorManager.getNumberOfDataEditors()).toBe(1);
  });
});