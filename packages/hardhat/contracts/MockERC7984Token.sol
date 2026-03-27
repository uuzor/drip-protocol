// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint64, InEuint64 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { ERC7984 } from "fhenix-confidential-contracts/contracts/ERC7984/ERC7984.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC7984Token is ERC7984, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC7984(name_, symbol_, decimals_, "") Ownable(msg.sender) {}

    function confidentialMint(address to, InEuint64 memory amount) external returns (euint64) {
        euint64 encAmount = FHE.asEuint64(amount);
        FHE.allowThis(encAmount);
        return _mint(to, encAmount);
    }
}
