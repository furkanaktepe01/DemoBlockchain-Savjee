const crypto = require('crypto');
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

class Transaction {

    constructor(fromAddress, toAddress, amount) {
        
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    calculateHash() {

        return crypto.createHash("sha256").update(
            this.fromAddress 
          + this.toAddress 
          + this.amount
          + this.timestamp
        ).digest("hex");
    }

    signTransaction(signingKey) {

        if (signingKey.getPublic("hex") !== this.fromAddress) {
            throw new Error("Invalid Public Key");
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, "base64");
        
        this.signature = sig.toDER("hex");
    }

    isValid() {

        if (this.fromAddress === "0") return true;

        if (!this.signature || this.signature.length === 0) {
            throw new Error("No Tx Signature Found");
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, "hex");

        return publicKey.verify(this.calculateHash(), this.signature);
    }

}

class Block {

    constructor(timestamp, transactions, previousHash = "") {
        
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = 0;
    }

    calculateHash() {
        
        return crypto.createHash('sha256').update(
            this.previousHash 
          + this.timestamp 
          + JSON.stringify(this.transactions)
          + this.nonce
        ).digest("hex");
    }

    mineBlock(difficulty) {
        
        while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
    }

    hasValidTransactions() {

        for (const tx of this.transactions) {

            if (!tx.isValid()) return false;
        }

        return true;
    }
 
}

class Blockchain {

    constructor() {
        
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    createGenesisBlock() {
        return new Block(Date.parse("01/01/2022"), [], "");
    }

    getLatestBlock() {
        return this.chain[this.chain.length -1];
    }

    minePendingTransactions(miningRewardAddress) {

       const rewardTx = new Transaction("0", miningRewardAddress, this.miningReward);
       this.addTransaction(rewardTx);
        
        let block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash());
        
        this.pendingTransactions = [];

        block.mineBlock(this.difficulty);

        this.chain.push(block);
    }

    addTransaction(tx) {

        if (!tx.fromAddress || !tx.toAddress) {
            throw new Error("Tx must include the sender and receiver addresses.");
        }

        if (!tx.isValid()) {
            throw new Error("Invalid Tx");
        }

        if (tx.amount <= 0) {
            throw new Error("Tx cannot have negative amount.");
        }

        const walletBalance = this.getBalanceOf(tx.fromAddress);
        if (walletBalance < tx.amount) {
            throw new Error("Insufficient Balance");
        }

        const pendingTxOfAddress = this.pendingTransactions
            .filter(ptx => ptx.fromAddress === tx.fromAddress);

        if (pendingTxOfAddress.length > 0) {

            const totalPendingAmount = pendingTxOfAddress
                .map(ptx => ptx.amount)
                .reduce((prev, curr) => prev + curr);

            const totalAmount = totalPendingAmount + tx.amount;
            if (walletBalance < totalAmount) {
                throw new Error("Adding Tx would make PendingTxs for this wallet exceed the wallet balance.");
            }    
        }    

        this.pendingTransactions.push(tx);
    }

    getBalanceOf(address) {
        
        let balance = 0;

        for (const block of this.chain) {
            for (const tx of block.transactions) {

                if (tx.fromAddress === address) {
                    balance -= tx.amount;
                }

                if (tx.toAddress === address) {
                    balance += tx.amount;
                }
            }
        }

        return balance;
    }

    getAllTransactionsOf(address) {

        const txs = [];

        for (const block of this.chain) {
            for (const tx of block.transactions) {

                if (tx.fromAddress === address || tx.toAddress === address) {
                    txs.push(tx);
                }
            }
        }

        return txs;
    }

    isChainValid() {

        const realGenesis = JSON.stringify(this.createGenesisBlock());
        const currentGenesis = JSON.stringify(this.chain[0]);

        if (realGenesis !== currentGenesis) {
            return false;
        }
        
        for (let i = 1; i < this.chain.length; i++) {
           
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i-1];
        
            if(!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }        
        }

        return true;
    }
}

module.exports = { Blockchain, Block, Transaction };