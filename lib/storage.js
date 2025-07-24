'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const BLOCKCHAIN = '.blockchain.json';

class Block {
  constructor(meta, data, prevHash = '0') {
    this.id = meta.id || 0;
    this.timestamp = meta.timestamp || Date.now();
    this.data = data;
    this.hash = Block.hash(data, prevHash);
  }

  static hash(data, prevHash) {
    const block = prevHash + JSON.stringify(data);
    return crypto.createHash('sha256').update(block).digest('hex');
  }
}

const toBool = [() => true, () => false];

class Blockchain {
  constructor(path) {
    this.path = path;
    this.chain = [];
    return this.#init();
  }

  async #init() {
    await fs.mkdir(this.path, { recursive: true }).catch(() => {});
    const file = path.join(this.path, BLOCKCHAIN);
    const exists = await fs.access(file).then(...toBool);
    if (exists) {
      await this.load();
    } else {
      const genesis = new Block({ id: 0 }, {}, '0');
      this.chain.push(genesis);
      await this.saveBlockData(genesis);
      await this.saveChain();
    }
    return this;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  async addBlock(data) {
    const prevBlock = this.getLatestBlock();
    const block = new Block({ id: prevBlock.id + 1 }, data, prevBlock.hash);
    this.chain.push(block);
    await this.saveBlockData(block);
    await this.saveChain();
    return block;
  }

  async saveBlockData(block) {
    const file = path.join(this.path, `${block.hash}.json`);
    await fs.writeFile(file, JSON.stringify(block.data));
  }

  async saveChain() {
    const file = path.join(this.path, BLOCKCHAIN);
    const data = JSON.stringify(this.chain);
    await fs.writeFile(file, data);
  }

  async read(hash) {
    const file = path.join(this.path, `${hash}.json`);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) throw Error(`File not found ${file}`);
    const data = await fs.readFile(file);
    return JSON.parse(data);
  }

  async load() {
    const file = path.join(this.path, BLOCKCHAIN);
    const raw = await fs.readFile(file);
    const blocks = JSON.parse(raw);
    this.chain = new Array(blocks.length);
    let prevHash = '0';
    for (let i = 0; i < blocks.length; i++) {
      const meta = blocks[i];
      const data = await this.read(meta.hash);
      const block = new Block(meta, data, prevHash);
      this.chain[i] = block;
      prevHash = block.hash;
    }
  }

  isValid() {
    let prevHash = '0';
    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const expectedHash = Block.hash(current.data, prevHash);
      if (current.hash !== expectedHash) return false;
      prevHash = current.hash;
    }
    return true;
  }
}

module.exports = { Block, Blockchain };
