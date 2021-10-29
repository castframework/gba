const ExampleERC20 = artifacts.require('ExampleERC20');

module.exports = async function (deployer) {
  // await deployer.deploy(ExampleERC20);
  deployer.deploy(ExampleERC20, 100);
} as Truffle.Migration;

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export {};
