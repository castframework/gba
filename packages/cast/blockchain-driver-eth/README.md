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

# Ethereum Blockchain Driver

## Usage

```typescript
import { EthereumBlockchainDriver } from '@castframework/blockchain-driver-eth';

const driver = new EthereumBlockchainDriver({
  config: {
    // Config here
  },
  signer: new PrivateKeySigner('your private key'),
  nodeURL: 'your node url',
});
```

## Configuration

### Default

| Property | Type | Description | Default value |
| ------- | ----------- | ----------- | ----------- |
| `nodeURL` | string | TODO description |  5 |
| `signer` | number | TODO description |  5 |
| `config` | EthereumConfig | Ethereum driver configuration object | See below  |
| `config.eventDelayInBlocks` | number | TODO description |  5 |
| `config.keepAliveIntervalInSeconds` | number | TODO description |  10 |
| `config.subscriptionsLogIntervalInSeconds` | number | TODO description |  10 |
| `config.minGasPriceInGWei` | number | TODO description |  100 |
| `config.maxGasPriceInGWei` | number | TODO description |  350 |
| `config.gasPriceFactor` | number | TODO description |  1.2 |
| `config.transactionBoostFactor` | number | TODO description |  1.2 |
| `config.routineCallLoggingPeriod` | number | TODO description |  0 |
| `config.transactionInfoProviderFactory` | TransactionInfoProviderFactory\<EthereumBlockchainDriver\> | TODO description |  0 |

## Example

```typescript
import { EthereumConfig } from '@castframework/blockchain-driver-eth';

const config: EthereumConfig = {
  numberOfConfirmation: 5,
  eventDelayInBlocks: 5,
}
```
