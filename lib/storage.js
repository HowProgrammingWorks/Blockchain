'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

class Block {
  constructor(index, data, prevHash = '') {
    this.index = index;
    this.timestamp = Date.now();
    this.data = data;
    this.prevHash = prevHash;
    this.hash = Block.hashBlock(this);
  }

  static hashBlock(block) {
    const blockData = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      prevHash: block.prevHash,
    });
    return crypto.createHash('sha256').update(blockData).digest('hex');
  }
}

class Blockchain {
  constructor(filePath) {
    this.filePath = filePath;
    this.dataDir = require('path').dirname(filePath);
    this.chain = [Blockchain.createGenesisBlock()];
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  static createGenesisBlock() {
    return new Block(0, { genesis: true }, '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const prevBlock = this.getLatestBlock();
    const block = new Block(prevBlock.index + 1, data, prevBlock.hash);
    this.chain.push(block);
    this.saveBlockData(block);
    this.saveChain();
    return block;
  }

  saveBlockData(block) {
    const file = require('path').join(this.dataDir, `${block.hash}.json`);
    fs.writeFileSync(file, JSON.stringify(block.data, null, 2));
  }

  saveChain() {
    // Only store block metadata, not full data
    const chainMeta = this.chain.map((b) => ({
      index: b.index,
      timestamp: b.timestamp,
      hash: b.hash,
      prevHash: b.prevHash,
    }));
    fs.writeFileSync(this.filePath, JSON.stringify(chainMeta, null, 2));
  }

  load() {
    if (!fs.existsSync(this.filePath)) return;
    const raw = fs.readFileSync(this.filePath);
    const arr = JSON.parse(raw);
    this.chain = arr.map((meta) => {
      let data = {};
      const dataFile = require('path').join(this.dataDir, `${meta.hash}.json`);
      if (fs.existsSync(dataFile)) {
        data = JSON.parse(fs.readFileSync(dataFile));
      }
      const block = new Block(meta.index, data, meta.prevHash);
      block.timestamp = meta.timestamp;
      block.hash = meta.hash;
      return block;
    });
  }

  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const curr = this.chain[i];
      const prev = this.chain[i - 1];
      if (curr.prevHash !== prev.hash) return false;
      if (curr.hash !== Block.hashBlock(curr)) return false;
    }
    return true;
  }
}

module.exports = { Block, Blockchain };
