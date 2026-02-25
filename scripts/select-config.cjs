const fs = require('fs');
const path = require('path');

function main(config) {
    const from = path.join('.', 'configs', config);
    console.log(`Activating configuration from ${from}.`);
    // Copy config.json
    const configSrc = path.join(from, 'config.json');
    // Read config.json
    const configContent = fs.readFileSync(configSrc, 'utf-8');
    const configJson = JSON.parse(configContent);

    // Build examples from config and copy them
    const examples = [];
    for (const examplePath of configJson.exampleDirs) {
        const exampleFullPath = path.join(from, examplePath);
        console.log(`Processing example from ${exampleFullPath}.`);
        const exampleMetaPath = path.join(exampleFullPath, 'metadata.json');
        const exampleMeta = fs.readFileSync(exampleMetaPath, 'utf-8');
        const exampleMetaJson = JSON.parse(exampleMeta);
        const mappingPath = path.join(exampleFullPath, exampleMetaJson.mapping);
        const mappingText = fs.readFileSync(mappingPath, 'utf-8');
        const dataArray = [];
        for (const dataMeta of exampleMetaJson.data) {
            const dataPath = path.join(exampleFullPath, dataMeta.path);
            const dataValue = fs.readFileSync(dataPath, 'utf-8');
            dataArray.push({ path: dataMeta.path, type: dataMeta.type, value: dataValue });
        }
        examples.push({ label: exampleMetaJson.label, mapping: mappingText, data: dataArray });
    }
    configJson.examples = examples;

    const configDest = path.join('.', 'config.json');
    fs.writeFileSync(configDest, JSON.stringify(configJson, null, 2));

}

main(process.argv[2]);