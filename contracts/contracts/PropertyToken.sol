// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PropertyToken
 * @dev ERC-721 token representing individual real estate properties
 * Each token represents a unique property with metadata
 */
contract PropertyToken is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    
    // Property metadata structure
    struct Property {
        uint256 tokenId;
        string name;
        string description;
        string location;
        uint256 totalValue; // Property value in wei
        uint256 totalShares; // Total fractional shares available
        uint256 sharesSold; // Shares sold so far
        address originalOwner;
        bool isActive;
        uint256 createdAt;
        string imageUrl;
        string[] documents; // URLs to property documents
    }
    
    // Mapping from token ID to property details
    mapping(uint256 => Property) public properties;
    
    // Mapping from property token ID to fractional token contract address
    mapping(uint256 => address) public fractionalTokens;
    
    // Events
    event PropertyCreated(
        uint256 indexed tokenId,
        string name,
        uint256 totalValue,
        uint256 totalShares,
        address indexed owner
    );
    
    event PropertyUpdated(uint256 indexed tokenId, string name, uint256 totalValue);
    event PropertyDeactivated(uint256 indexed tokenId);
    
    constructor() ERC721("RealEstateProperty", "REP") Ownable(msg.sender) {}
    
    /**
     * @dev Create a new property token
     * @param name Property name
     * @param description Property description
     * @param location Property location
     * @param totalValue Total property value in wei
     * @param totalShares Total number of fractional shares
     * @param imageUrl Property image URL
     * @param documents Array of document URLs
     */
    function createProperty(
        string memory name,
        string memory description,
        string memory location,
        uint256 totalValue,
        uint256 totalShares,
        string memory imageUrl,
        string[] memory documents
    ) external onlyOwner returns (uint256) {
        require(totalValue > 0, "Property value must be greater than 0");
        require(totalShares > 0, "Total shares must be greater than 0");
        require(bytes(name).length > 0, "Property name cannot be empty");
        
        uint256 newTokenId = _nextTokenId++;
        
        Property memory newProperty = Property({
            tokenId: newTokenId,
            name: name,
            description: description,
            location: location,
            totalValue: totalValue,
            totalShares: totalShares,
            sharesSold: 0,
            originalOwner: msg.sender,
            isActive: true,
            createdAt: block.timestamp,
            imageUrl: imageUrl,
            documents: documents
        });
        
        properties[newTokenId] = newProperty;
        
        // Mint the property token to the creator
        _mint(msg.sender, newTokenId);
        
        emit PropertyCreated(newTokenId, name, totalValue, totalShares, msg.sender);
        
        return newTokenId;
    }
    
    /**
     * @dev Set the fractional token contract address for a property
     * @param tokenId Property token ID
     * @param fractionalTokenAddress Address of the fractional token contract
     */
    function setFractionalToken(uint256 tokenId, address fractionalTokenAddress) external onlyOwner {
        try this.ownerOf(tokenId) returns (address) {
            // Token exists
        } catch {
            revert("Property does not exist");
        }
        require(fractionalTokenAddress != address(0), "Invalid fractional token address");
        
        fractionalTokens[tokenId] = fractionalTokenAddress;
    }
    
    /**
     * @dev Update property information
     * @param tokenId Property token ID
     * @param name New property name
     * @param description New property description
     * @param totalValue New total value
     */
    function updateProperty(
        uint256 tokenId,
        string memory name,
        string memory description,
        uint256 totalValue
    ) external onlyOwner {
        try this.ownerOf(tokenId) returns (address) {
            // Token exists
        } catch {
            revert("Property does not exist");
        }
        require(properties[tokenId].isActive, "Property is not active");
        require(totalValue > 0, "Property value must be greater than 0");
        
        properties[tokenId].name = name;
        properties[tokenId].description = description;
        properties[tokenId].totalValue = totalValue;
        
        emit PropertyUpdated(tokenId, name, totalValue);
    }
    
    /**
     * @dev Deactivate a property
     * @param tokenId Property token ID
     */
    function deactivateProperty(uint256 tokenId) external onlyOwner {
        try this.ownerOf(tokenId) returns (address) {
            // Token exists
        } catch {
            revert("Property does not exist");
        }
        require(properties[tokenId].isActive, "Property is already inactive");
        
        properties[tokenId].isActive = false;
        
        emit PropertyDeactivated(tokenId);
    }
    
    /**
     * @dev Get property details
     * @param tokenId Property token ID
     * @return Property struct containing all property information
     */
    function getProperty(uint256 tokenId) external view returns (Property memory) {
        try this.ownerOf(tokenId) returns (address) {
            // Token exists
        } catch {
            revert("Property does not exist");
        }
        return properties[tokenId];
    }
    
    /**
     * @dev Get total number of properties created
     * @return Total count of properties
     */
    function getTotalProperties() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @dev Check if a property exists
     * @param tokenId Property token ID
     * @return True if property exists
     */
    function propertyExists(uint256 tokenId) external view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Override tokenURI to return property metadata
     * @param tokenId Property token ID
     * @return Token URI (can be implemented for IPFS or centralized storage)
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        try this.ownerOf(tokenId) returns (address) {
            // Token exists
        } catch {
            revert("Property does not exist");
        }
        
        // For now, return a basic JSON metadata
        // In production, this should point to IPFS or a centralized metadata service
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(abi.encodePacked(
                '{"name":"', properties[tokenId].name, '",',
                '"description":"', properties[tokenId].description, '",',
                '"image":"', properties[tokenId].imageUrl, '",',
                '"attributes":[',
                '{"trait_type":"Location","value":"', properties[tokenId].location, '"},',
                '{"trait_type":"Total Value","value":"', _toString(properties[tokenId].totalValue), '"},',
                '{"trait_type":"Total Shares","value":"', _toString(properties[tokenId].totalShares), '"}',
                ']}'
            ))
        ));
    }
    
    /**
     * @dev Internal function to convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Internal function to encode bytes to base64
     */
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        string memory result = new string(4 * ((data.length + 2) / 3));
        
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            
            for {
                let i := 0
            } lt(i, mload(data)) {
                i := add(i, 3)
            } {
                let input := and(mload(add(data, add(32, i))), 0xffffff)
                
                let out := mload(add(tablePtr, and(shr(250, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(244, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(238, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(232, input), 0x3F))), 0xFF))
                out := shl(8, out)
                
                mstore(resultPtr, out)
                
                resultPtr := add(resultPtr, 4)
            }
            
            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }
        }
        
        return result;
    }
}
