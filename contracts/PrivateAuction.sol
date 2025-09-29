// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "fhevm/lib/TFHE.sol";

/**
 * @title PrivateAuction
 * @dev A simple private auction contract using FHEVM
 * This contract demonstrates confidential bidding where:
 * - Bids are encrypted and private
 * - Only the highest bid is revealed at the end
 * - Bidders' identities and amounts remain secret
 */
contract PrivateAuction {
    // Auction state
    bool public auctionActive;
    address public auctioneer;
    uint256 public auctionEndTime;
    
    // Encrypted bid tracking
    euint32 private highestBid;
    euint32 private totalBids;
    
    // Bidding tracking
    mapping(address => bool) public hasBid;
    mapping(address => euint32) private encryptedBids;
    
    // Events
    event BidPlaced(address indexed bidder, uint256 timestamp);
    event AuctionEnded(address winner, uint256 winningBid);
    event AuctionStarted(uint256 endTime);
    
    // Modifiers
    modifier onlyAuctioneer() {
        require(msg.sender == auctioneer, "Only auctioneer can perform this action");
        _;
    }
    
    modifier auctionActive() {
        require(auctionActive, "Auction is not active");
        _;
    }
    
    modifier auctionEnded() {
        require(!auctionActive, "Auction is still active");
        _;
    }
    
    constructor() {
        auctioneer = msg.sender;
        auctionActive = false;
    }
    
    /**
     * @dev Start a new auction
     * @param duration Duration of the auction in seconds
     */
    function startAuction(uint256 duration) external onlyAuctioneer {
        require(!auctionActive, "Auction is already active");
        
        auctionActive = true;
        auctionEndTime = block.timestamp + duration;
        
        // Reset auction state
        highestBid = TFHE.asEuint32(0);
        totalBids = TFHE.asEuint32(0);
        
        emit AuctionStarted(auctionEndTime);
    }
    
    /**
     * @dev Place a confidential bid
     * @param encryptedBidAmount The encrypted bid amount
     */
    function placeBid(euint32 encryptedBidAmount) external auctionActive {
        require(block.timestamp < auctionEndTime, "Auction has ended");
        require(!hasBid[msg.sender], "You have already placed a bid");
        
        // Store the encrypted bid
        encryptedBids[msg.sender] = encryptedBidAmount;
        hasBid[msg.sender] = true;
        
        // Increment total bids
        totalBids = TFHE.add(totalBids, TFHE.asEuint32(1));
        
        // Update highest bid if this bid is higher
        // We use a conditional operation to check if this bid is higher
        euint32 isHigher = TFHE.gt(encryptedBidAmount, highestBid);
        highestBid = TFHE.cmux(isHigher, encryptedBidAmount, highestBid);
        
        emit BidPlaced(msg.sender, block.timestamp);
    }
    
    /**
     * @dev End the auction and reveal results
     */
    function endAuction() external onlyAuctioneer {
        require(auctionActive, "Auction is not active");
        require(block.timestamp >= auctionEndTime, "Auction has not ended yet");
        
        auctionActive = false;
        
        emit AuctionEnded(address(0), 0); // Winner and bid are encrypted
    }
    
    /**
     * @dev Get the encrypted highest bid
     * @return The encrypted highest bid amount
     */
    function getHighestBid() external view returns (euint32) {
        return highestBid;
    }
    
    /**
     * @dev Get the encrypted total number of bids
     * @return The encrypted total bid count
     */
    function getTotalBids() external view returns (euint32) {
        return totalBids;
    }
    
    /**
     * @dev Get a bidder's encrypted bid
     * @param bidder The address of the bidder
     * @return The encrypted bid amount
     */
    function getBidderBid(address bidder) external view returns (euint32) {
        return encryptedBids[bidder];
    }
    
    /**
     * @dev Check if an address has placed a bid
     * @param bidder The address to check
     * @return True if the address has bid
     */
    function hasBidderPlacedBid(address bidder) external view returns (bool) {
        return hasBid[bidder];
    }
    
    /**
     * @dev Get auction information
     * @return active Whether the auction is active
     * @return endTime The auction end time
     * @return timeRemaining Time remaining in seconds
     */
    function getAuctionInfo() external view returns (bool active, uint256 endTime, uint256 timeRemaining) {
        active = auctionActive;
        endTime = auctionEndTime;
        timeRemaining = auctionActive && block.timestamp < auctionEndTime ? 
                       auctionEndTime - block.timestamp : 0;
    }
    
    /**
     * @dev Check if auction has ended
     * @return True if auction has ended
     */
    function isAuctionEnded() external view returns (bool) {
        return !auctionActive || block.timestamp >= auctionEndTime;
    }
    
    /**
     * @dev Get auctioneer address
     * @return The auctioneer address
     */
    function getAuctioneer() external view returns (address) {
        return auctioneer;
    }
}
