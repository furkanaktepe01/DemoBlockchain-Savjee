const { Blockchain, Block, Transaction } = require("./blockchain"); 
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const myKey = ec.keyFromPrivate("62651b2e890ba0a4a395f68d8576fdea7fe81cb7d15ea6e6dc4e3e2d144e36e7");

const myWalletAddress = myKey.getPublic("hex");


let savjeeCoin = new Blockchain();

const tx_1 = new Transaction(myWalletAddress, "address-4", 10);
tx_1.signTransaction(myKey);
savjeeCoin.addTransaction(tx_1);

console.log("\n Starting the miner...");
savjeeCoin.minePendingTransactions(myWalletAddress);
savjeeCoin.minePendingTransactions(myWalletAddress);

console.log("Balance of miner-address: " + savjeeCoin.getBalanceOf(myWalletAddress));
