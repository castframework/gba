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


# Transaction Manager

## Description

The transaction manager is used to add common mechanics such as retry to every blockchain driver implementation.

## Usage

```typescript
import { TezoslockchainDriver } from '@castframework/blockchain-driver-tz';

const transactionManager = new TransactionManager({
  driver: driver, // Your Ethereum or Tezos driver
});
```

## Configuration

### Default

| Property | Type | Description | Default value |
| ------- | ----------- | ----------- | ----------- |
| `driver` | BlockchainDriver | TODO description  |  - |
| `logger` | Logger | TODO description  |  - |
| `txRetryConfig` | TxRetryConfig | Transaction retry configuration | See below |
| `txRetryConfig.initialIntervalInMs` | number | TODO description | 1000 |
| `txRetryConfig.maxIntervalInMs` | number | TODO description | 2000  |
| `txRetryConfig.maxRetries` | number | TODO description | 50 |


## Example

```typescript
import { TezosConfig } from '@castframework/blockchain-driver-tz';
import { EthereumBlockchainDriver } from './EthereumBlockchainDriver';
import { getLogger } from 'log4js';

const config: TransactionManagerConfig<EthereumBlockchainDriver> = {
  driver: new EthereumBlockchainDriver,
  logger: getLogger(),
  txRetryConfig: {
    initialIntervalInMs: 1000,
    maxIntervalInMs: 10000,
    maxRetries: 5
  }
}
```
