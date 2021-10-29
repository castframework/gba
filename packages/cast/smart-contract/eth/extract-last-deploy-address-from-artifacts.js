/*
  Beware ! this is a script
*/
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2));
const networkFolder = argv['network-folder'];

if (typeof networkFolder !== 'string') {
  console.error('No network folder set')
  throw new Error('No network folder set')
}

const nodeFile = fs.readFileSync(`${networkFolder}/ethereum/node.json`, 'utf8')
const nodeConfig = JSON.parse(nodeFile)

if(nodeConfig.network_id   === undefined) {
  throw new Error('Missing nodeConfig property from node config file')
}

const build_directory = './build/contracts';

const contractConfig = fs
  .readdirSync(build_directory)
  .filter(fn => fn.endsWith(".json"))
  .map(file => {
    const filePath = path.join(build_directory, file);
    const fileContents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContents);
  })
  .reduce(
    (acc, f) => {
      const addr = f.networks ?
        f.networks[nodeConfig.network_id] ?
          f.networks[nodeConfig.network_id].address
          : undefined
        : undefined;

      return addr ? { ...acc, [f.contractName]: addr } : acc;
    },
    {},
  );

fs.writeFileSync(
  `${networkFolder}/ethereum/contracts.json`,
  JSON.stringify(contractConfig, null, ' '),
);
