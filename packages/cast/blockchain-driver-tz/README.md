<p align="center">
  <img src="https://www.cast-framework.com/wp-content/themes/forge-framework/img/logo-cast-w.svg" alt="drawing" width="200"/>
</p>


<p align="center">Typescript libraries to provide blockchain agnostic tools for interacting with Smart Contracts.</p>
<p align="center">
  <a href="https://codecov.io/gh/castframework/gba" target="_blank"><img alt="Coverage" src="https://codecov.io/gh/castframework/gba/branch/main/graph/badge.svg?token=3NKA7YJ31D" /></a>
  <a href="https://github.com/castframework/gba/actions/workflows/release.yml" target="_blank"><img alt="Release status" src="https://github.com/castframework/gba/actions/workflows/release.yml/badge.svg" /></a>
  <a href="https://github.com/castframework/gba/actions/workflows/main.yml" target="_blank"><img alt="Pre-release status" src="https://github.com/castframework/gba/actions/workflows/main.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@castframework/transaction-manager" target="_blank"><img alt="Latest version"src="https://img.shields.io/npm/v/@castframework/transaction-manager/latest" /></a>
  <a href="https://www.npmjs.com/package/@castframework/transaction-manager" target="_blank"><img alt="Next version" src="https://img.shields.io/npm/v/@castframework/transaction-manager/next"></a>
  <img alt="Dependencies state" src="https://img.shields.io/librariesio/github/castframework/gba">
  <img alt="License" src="https://img.shields.io/github/license/castframework/gba">
</p>

# Tezos Blockchain Driver

## Usage

```typescript
import { TezoslockchainDriver } from '@castframework/blockchain-driver-tz';

const driver = new TezoslockchainDriver({
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
| `nodeURL` | string | TODO description  |  5 |
| `signer` | number | TODO description  |  5 |
| `config` | TezosConfig | Tezos driver configuration object | See below  |
| `config.confirmationPollingIntervalSecond` | number | TODO description |  5 |
| `config.confirmationPollingTimeoutSecond` | number | TODO description  |  180 |
| `config.defaultConfirmationCount` | number | TODO description  |  5 |
| `config.shouldObservableSubscriptionRetry` | boolean | TODO description  |  true |
| `config.observableSubscriptionRetryFunction` | [MonoTypeOperatorFunction](https://rxjs-dev.firebaseapp.com/api/index/interface/MonoTypeOperatorFunction) | TODO description  |  See below |
| `config.transactionInfoProviderFactory` | TransactionInfoProviderFactory\<TezosBlockchainDriver\> | TODO description |  true |


## Example

```typescript
import { TezosConfig } from '@castframework/blockchain-driver-tz';

const config: TezosConfig = {
  confirmationPollingTimeoutSecond: 3600,
  defaultConfirmationCount: 2,
}
```

## View mappers

TODO: describe event sink 

## Events

TODO: describe event sink 
