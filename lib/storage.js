'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const BLOCKCHAIN = '.blockchain.json';

class Block {
  constructor(meta, hash) {
    this.id = meta.id || 0;
    this.timestamp = meta.timestamp || Date.now();
    this.hash = hash || meta.hash;
  }

  static hash(data, prevHash) {
    const block = prevHash + JSON.stringify(data);
    return crypto.createHash('sha256').update(block).digest('hex');
  }
}

const toBool = [() => true, () => false];

class Blockchain {
  constructor(dir) {
    this.path = dir;
    return this.#init();
  }

  async #init() {
    await fs.mkdir(this.path, { recursive: true }).catch(() => {});
    const file = path.join(this.path, BLOCKCHAIN);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) {
      const data = {};
      const hash = Block.hash(data, '0');
      const genesis = { id: 0, timestamp: Date.now(), hash };
      await this.writeBlockData(hash, data);
      await this.appendChain(genesis);
    }
    return this;
  }

  async appendChain(block) {
    const file = path.join(this.path, BLOCKCHAIN);
    const blocks = await this.getChain();
    blocks.push(block);
    await fs.writeFile(file, JSON.stringify(blocks));
  }

  async getChain() {
    const file = path.join(this.path, BLOCKCHAIN);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) return [];
    const raw = await fs.readFile(file);
    return JSON.parse(raw);
  }

  async getLatestBlock() {
    const blocks = await this.getChain();
    return blocks.length ? blocks[blocks.length - 1] : null;
  }

  async addBlock(data) {
    const blocks = await this.getChain();
    const prev = blocks[blocks.length - 1];
    const id = prev.id + 1;
    const timestamp = Date.now();
    const hash = Block.hash(data, prev.hash);
    await this.writeBlockData(hash, data);
    await this.appendChain({ id, timestamp, hash });
    return { id, timestamp, hash };
  }

  async writeBlockData(hash, data) {
    const file = path.join(this.path, `${hash}.json`);
    await fs.writeFile(file, JSON.stringify(data));
  }

  async readBlockData(hash) {
    const file = path.join(this.path, `${hash}.json`);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) throw Error(`File not found ${file}`);
    const data = await fs.readFile(file);
    return JSON.parse(data);
  }

  async isValid() {
    const blocks = await this.getChain();
    let prevHash = '0';
    for (const block of blocks) {
      const data = await this.readBlockData(block.hash);
      const expectedHash = Block.hash(data, prevHash);
      if (block.hash !== expectedHash) return false;
      prevHash = block.hash;
    }
    return true;
  }
}

module.exports = { Block, Blockchain };
