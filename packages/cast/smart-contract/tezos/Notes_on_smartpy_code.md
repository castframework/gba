### General 

- Build and deploy configuration are set in `smpconfig.json`
- origination sequence and constant are in `origination.json`

### Imports

- all globals library are available
- all project import are absolute to the project root
- if you need to import code using Smartpy syntax (eg. 'sp.for' ) use importContract 

### Standard tree 

```
myContractName
  |-ContractName.py
  |-constants.py
  |-types.py
```