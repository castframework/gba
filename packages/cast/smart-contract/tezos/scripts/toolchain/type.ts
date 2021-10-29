export type MichelsonExpression = string;
export type TezosAddress = string;
export type TezosKey = string;

export type JSONMichelsonArgs = {
  prim: string;
  annots?: Array<string>;
  args?: Array<JSONMichelsonArgs | Array<JSONMichelsonArgs>>;
};

export type JSONMichelson = Array<JSONMichelsonArgs>;

export type FlexTesaAccount = {
  publicAddress: TezosAddress;
  publicKey: TezosKey;
  privateKey: TezosKey;
};

export type EnvironmentConfig = {
  factoryAddress: TezosAddress;
  eventSinkContractAddress: TezosAddress;
  builderContractAddress: TezosAddress;
};

export type ContractsConfig = { [contractName: string]: string };
export type KeysConfig = {
  admin: TezosKey;
  registrar: TezosKey;
  [accountName: string]: TezosKey;
};
export type NodeConfig = { host: string };

export type NetworkConfig = {
  keysConfig: KeysConfig;
  nodeConfig: NodeConfig;
};

export type SmpConfig = {
  srcDir: string;
  pattern: string;
};
