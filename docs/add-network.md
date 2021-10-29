# Deploy to custom network

Networks are defined by 3 files for each blockchain: 
- `contracts.json` (git ignored)
- `keys.json`
- `node.json`

```
networks
└── local
    ├── ethereum
    │         ├── contracts.json
    │         ├── keys.json
    │         └── node.json
    └── tezos
        ├── contracts.json
        ├── keys.json
        └── node.json
```

You can add your own network folder with your `keys.json` and `node.json` and then use the `--network-argument` of `iter-all` to deploy on your network

## `contracts.json`

The `contracts.json` file contains the addresses of the smart contracts deployed on the network we want to interact with.  
When running [the setup procedure](../README.md#run-locally). The `iter-all` script will deploy smart contracts to the different blockchain and write the addresses to the `contracts.json` file.

**Example:**
```json
{
 "ExampleERC20": "0xeA3F750Caa963F0967472540551E2a135f1717C9"
}
```

## `keys.json`

The `keys.json` contains the private keys of the different accounts we will be using.
**Example:**
```json
{
  "privateKey1": "0x22aabb811efca4e6f4748bd18a46b502fa85549df9fa07da649c0a148d7d5530",
  "privateKey2": "0x64e02814da99b567a92404a5ac82c087cd41b0065cd3f4c154c14130f1966aaf",
}
```

## `node.json`

The `node.json` contains the configuration to connect to the blockchain node. It is different for each blockchain

**Ethereum example:**
```json
{
  "host": "ws://localhost:8545",
  "network_id": "5777",
  "skipDryRun": true,
  "mnemonic": "minimum symptom minute gloom tragic situate silver mechanic salad amused elite beef"
}
```

**Tezos example:**
```json
{
  "host": "ws://localhost:8545",
  "network_id": "5777",
  "skipDryRun": true,
  "mnemonic": "minimum symptom minute gloom tragic situate silver mechanic salad amused elite beef"
}
```
