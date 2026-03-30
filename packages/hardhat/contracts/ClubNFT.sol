// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ClubNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MATCH_CONTRACT_ROLE = keccak256("MATCH_CONTRACT_ROLE");
    bytes32 public constant UPGRADE_CONTRACT_ROLE = keccak256("UPGRADE_CONTRACT_ROLE");

    uint8 public constant ATTRIBUTE_ATTACK = 0;
    uint8 public constant ATTRIBUTE_DEFENSE = 1;
    uint8 public constant ATTRIBUTE_MIDFIELD = 2;
    uint8 public constant ATTRIBUTE_STAMINA = 3;

    struct ClubStats {
        uint8 attack;
        uint8 defense;
        uint8 midfield;
        uint8 stamina;
        uint16 wins;
        uint16 losses;
        bool fanTokenUnlocked;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 tokenId => ClubStats stats) private _clubStats;

    event ClubMinted(address indexed owner, uint256 indexed tokenId);
    event MatchRecorded(uint256 indexed tokenId, bool won, uint16 wins, uint16 losses, bool fanTokenUnlocked);
    event AttributeUpgraded(uint256 indexed tokenId, uint8 indexed attribute, address indexed payer, uint8 newValue);

    error InvalidAttribute(uint8 attribute);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        _setRoleAdmin(MATCH_CONTRACT_ROLE, ADMIN_ROLE);
        _setRoleAdmin(UPGRADE_CONTRACT_ROLE, ADMIN_ROLE);
    }

    function mint() external returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        bytes32 baseRandom = keccak256(abi.encodePacked(block.prevrandao, msg.sender, tokenId));

        _clubStats[tokenId] = ClubStats({
            attack: _toRangedStat(baseRandom, 0),
            defense: _toRangedStat(baseRandom, 1),
            midfield: _toRangedStat(baseRandom, 2),
            stamina: _toRangedStat(baseRandom, 3),
            wins: 0,
            losses: 0,
            fanTokenUnlocked: false
        });

        emit ClubMinted(msg.sender, tokenId);
    }

    function getStats(uint256 tokenId) external view returns (ClubStats memory) {
        _requireOwned(tokenId);
        return _clubStats[tokenId];
    }

    function recordMatch(uint256 tokenId, bool won) external onlyRole(MATCH_CONTRACT_ROLE) {
        _requireOwned(tokenId);

        ClubStats storage stats = _clubStats[tokenId];

        if (won) {
            stats.wins += 1;
            if (stats.wins >= 10) {
                stats.fanTokenUnlocked = true;
            }
        } else {
            stats.losses += 1;
        }

        emit MatchRecorded(tokenId, won, stats.wins, stats.losses, stats.fanTokenUnlocked);
    }

    function upgradeAttribute(uint256 tokenId, uint8 attribute, address payer) external onlyRole(UPGRADE_CONTRACT_ROLE) {
        _requireOwned(tokenId);

        ClubStats storage stats = _clubStats[tokenId];
        uint8 newValue;

        if (attribute == ATTRIBUTE_ATTACK) {
            newValue = _incrementStat(stats.attack);
            stats.attack = newValue;
        } else if (attribute == ATTRIBUTE_DEFENSE) {
            newValue = _incrementStat(stats.defense);
            stats.defense = newValue;
        } else if (attribute == ATTRIBUTE_MIDFIELD) {
            newValue = _incrementStat(stats.midfield);
            stats.midfield = newValue;
        } else if (attribute == ATTRIBUTE_STAMINA) {
            newValue = _incrementStat(stats.stamina);
            stats.stamina = newValue;
        } else {
            revert InvalidAttribute(attribute);
        }

        emit AttributeUpgraded(tokenId, attribute, payer, newValue);
    }

    function _toRangedStat(bytes32 baseRandom, uint256 salt) private pure returns (uint8) {
        uint256 value = uint256(keccak256(abi.encodePacked(baseRandom, salt)));
        return uint8((value % 91) + 10);
    }

    function _incrementStat(uint8 value) private pure returns (uint8) {
        if (value >= 100) {
            return 100;
        }
        return value + 1;
    }
}
