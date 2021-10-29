pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ExampleERC20 is ERC20 {
    constructor(uint256 initialSupply) ERC20("ExampleERC20", "EXP20") {
        _mint(msg.sender, initialSupply);
    }
}
