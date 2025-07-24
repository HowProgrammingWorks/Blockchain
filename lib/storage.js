'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const BLOCKCHAIN = '.blockchain.json';

class Block {
  constructor(meta, hash) {
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
    this.tailHash = null;
    return this.#init();
  }

  async #init() {
    await fs.mkdir(this.path, { recursive: true }).catch(() => {});
    const file = path.join(this.path, BLOCKCHAIN);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) {
      const timestamp = Date.now();
      const data = {};
      const hash = Block.hash(data, '0');
      await this.writeBlock({ prev: '0', timestamp, data });
      await this.writeChain(hash);
      this.tailHash = hash;
    } else {
      const raw = await fs.readFile(file);
      this.tailHash = JSON.parse(raw).tailHash;
    }
    return this;
  }

  async writeChain(tailHash) {
    const file = path.join(this.path, BLOCKCHAIN);
    await fs.writeFile(file, JSON.stringify({ tailHash }));
    this.tailHash = tailHash;
  }

  async addBlock(data) {
    const timestamp = Date.now();
    const hash = Block.hash(data, this.tailHash);
    await this.writeBlock({ prev: this.tailHash, timestamp, data });
    await this.writeChain(hash);
    return { timestamp, hash };
  }

  async writeBlock(block) {
    const hash = Block.hash(block.data, block.prev);
    const file = path.join(this.path, `${hash}.json`);
    await fs.writeFile(file, JSON.stringify(block));
  }

  async readBlock(hash) {
    const file = path.join(this.path, `${hash}.json`);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) throw Error(`File not found ${file}`);
    const data = await fs.readFile(file);
    return JSON.parse(data);
  }

  async isValid() {
    if (!this.tailHash) return false;
    let currentHash = this.tailHash;
    while (currentHash) {
      const block = await this.readBlock(currentHash);
      const expectedHash = Block.hash(block.data, block.prev);
      if (currentHash !== expectedHash) return false;
      if (block.prev === '0') break;
      currentHash = block.prev;
    }
    return true;
  }
}

module.exports = { Block, Blockchain };
