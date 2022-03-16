<p align="center">
  Generic Blockchain Adapter
</p>

<p align="center">
  <img src="https://www.cast-framework.com/wp-content/themes/forge-framework/img/logo-cast-w.svg" alt="drawing" width="200"/>
</p>


<p align="center">Typescript libraries to provide blockchain agnostic tools for interacting with Smart Contracts.</p>
<p align="center">
  <a href="https://codecov.io/gh/castframework/cast" target="_blank"><img alt="Coverage" src="https://codecov.io/gh/castframework/cast/branch/main/graph/badge.svg?token=3NKA7YJ31D" /></a>
  <a href="https://github.com/castframework/cast/actions/workflows/release.yml" target="_blank"><img alt="Release status" src="https://github.com/castframework/cast/actions/workflows/release.yml/badge.svg" /></a>
  <a href="https://github.com/castframework/cast/actions/workflows/main.yml" target="_blank"><img alt="Pre-release status" src="https://github.com/castframework/cast/actions/workflows/main.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@castframework/transaction-manager" target="_blank"><img alt="Latest version"src="https://img.shields.io/npm/v/@castframework/transaction-manager/latest" /></a>
  <a href="https://www.npmjs.com/package/@castframework/transaction-manager" target="_blank"><img alt="Next version" src="https://img.shields.io/npm/v/@castframework/transaction-manager/next"></a>
  <img alt="Dependencies state" src="https://img.shields.io/librariesio/github/castframework/cast">
  <img alt="License" src="https://img.shields.io/github/license/castframework/cast">
</p>

## Description

The CAST Framework is composed of market standards designed for digital blockchain-based securities. We aspire to promote innovation in capital markets with a set of open standards and technologies anyone can use to develop mutually compatible and interoperable digital financial services.


The CAST Framework enables the creation of an integrated financial ecosystem across blockchain-native and legacy systems.  
It is intended to give issuers, investors, financial institutions and other service providers easy, trustworthy and seamless access to the developing market of tokenized securities.  
Minimizing integration risk will give actors throughout the financial industry the ability to transition to a new model for financial markets without prohibitive cost overheads.

## Features

- Send blockchain transaction
- Read state of blockchain transaction
- Read blockchain state
- Listen to blockchain events
- Boost blockchain transaction (Ethereum only)
- Cancel blockchain transaction (Ethereum only)

**Note:** We do not support TZIP-16 for reading blockchain state. See more details [here](./packages/cast/blockchain-driver-tz/README.md#view-mappers).  
We also use conventions for Tezos events as Events mechanic do not exist in Tezos at the time of writing.

## Packages

See [packages documentation](./packages/cast)

## Usage

We build some examples of how to use the Transaction Manager and Drivers in [examples package](./packages/cast/examples)

```shell
# This may vary depending of the blockchain you want to support
npm install @castframework/transaction-manager @castframework/blockchain-driver-tz @castframework/blockchain-driver-eth
```

**Note:** to run the examples, you should follow [the setup procedure](./README.md#run-locally)


### Prepare a transaction manager and the driver

```typescript
import { EthereumBlockchainDriver, PrivateKeySigner } from '@castframework/blockchain-driver-eth';
import { TransactionManager } from '@castframework/transaction-manager';

const driver = new EthereumBlockchainDriver({
  config: {
    // Config here
  },
  signer: new PrivateKeySigner('your private key'),
  nodeURL: 'your node url',
});

const transactionManager = new TransactionManager({
  driver: driver,
});
```

See [Ethereum driver configuration reference](./packages/cast/blockchain-driver-eth#configuration)
See [Tezos driver configuration reference](./packages/cast/blockchain-driver-tz#configuration)


### Reading blockchain state

Example of reading blockchain state on Ethereum and Tezos.

```typescript
// With a Ethereum configured transactionManager

const balance = await transactionManager.call({
  methodName: 'balanceOf',
  methodParameters: ['0x71660c4005ba85c37ccec55d0c4493e66fe775d3'], // Coinbase address
  to: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Tether USD smart contract address
  blockchainSpecificParams: {
    abi, // ERC20 abi
  },
});
```

### Sending blockchain transaction

Example of sending blockchain transaction on Ethereum and Tezos.

```typescript
// With a Ethereum configured transactionManager

const transactionId = transactionManager.send({
  methodName: 'transfer',
  methodParameters: [
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', // Recipient: coinbase address
    10 // Number of tokens to send
  ],
  to: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Tether USD address on mainnet
  blockchainSpecificParams: {
    abi, // ERC20 abi
  },
});
```

### More examples

See more examples in the [examples package](./packages/cast/examples)

## Run locally

### Setup

```shell
# Clone repo locally
git clone https://github.com/castframework/cast.git && cd cast 

# Install lerna
npm i -g lerna

# Install dependencies
lerna bootstrap --hoist --strict && lerna run build

# Start local blockchains
docker-compose up -d

# Deploy sample smart contracts to local blockchains
./bin/iter-all
```

After this setup, you can run the different [examples](./packages/cast/examples) or the [integration tests](./packages/cast/testing)

### Run on your own network

If you want to run your tests on another blockchain network that the one we deployed with docker-compose you can [add a new network](docs/add-network.md) and use it this way:
```shell
./bin/iter-all --network-folder ./networks/yournetwork
```


## Deploy to other networks

See [Add network](docs/add-network.md)

## License

Apache 2.0
