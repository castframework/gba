var Web3 = require('web3');
const fs = require('fs');
const minimist = require('minimist');
const HDWalletProvider = require('@truffle/hdwallet-provider');

const argv = minimist(process.argv.slice(2));

const networkFolder = argv['network-folder'] || process.env['NETWORK_FOLDER'];

let networkObject = {};
if (typeof networkFolder !== 'string') {
  console.error('No network folder set');
} else {
  const nodeFilePath = `${networkFolder}/ethereum/node.json`;
  let nodeFile;
  try {
    nodeFile = fs.readFileSync(nodeFilePath, 'utf8');
  } catch (e) {
    console.error(
      `Could not read node.json file for network: ${e.toString()}`,
    );
    throw e;
  }


  try {
    networkObject = JSON.parse(nodeFile);
  } catch (e) {
    console.error(
      `Could not parse node.json file for network: ${e.toString()}`,
    );
    throw e;
  }

  let provider = undefined;
  if (!typeof networkObject.host === 'string') {
    throw Error(`Host property for network ${network} must be set`);
  }

  if (networkObject.host.startsWith('http://') || networkObject.host.startsWith('https://')) {
    if (networkObject.mnemonic) {
      provider = () => new HDWalletProvider(
        networkObject.mnemonic,
        new Web3.providers.HttpProvider(networkObject.host),
        0, // use address 0 by default
        100, // generate 15 addresses
      );
    } else {
      provider = () => new Web3.providers.HttpProvider(networkObject.host);
    }
  }
  if (networkObject.host.startsWith('wss://') || networkObject.host.startsWith('ws://')) {
    if (networkObject.mnemonic) {
      provider = () => new HDWalletProvider(
        networkObject.mnemonic,
        new Web3.providers.WebsocketProvider(networkObject.host),
        0, // use address 0 by default
        15, // generate 15 addresses
      );
    } else {
      provider = () => new Web3.providers.WebsocketProvider(networkObject.host);
    }
  }

  networkObject = {
    ...networkObject,
    provider,
  };
}


module.exports = {
  plugins: ['solidity-coverage', 'truffle-security'],
  mocha: {
    // not working currently because globals(artifacts, web3, assert, expect) are not shared between processes
    // package: require('mocha-parallel-tests').default,
    require: 'esm',
    reporter: 'mocha-multi-reporters',
    reporterOptions: { configFile: 'mocha-multi-reporters.json' },
    slow: 1000,
  },
  compilers: {
    solc: {
      version: '0.8.0',
      docker: false,
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  networks: {
    default: networkObject,
  },
};
