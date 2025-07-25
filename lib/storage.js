'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const BLOCKCHAIN = '.blockchain.json';

const toBool = [() => true, () => false];

const calculateHash = (data) => {
  const block = JSON.stringify(data);
  return crypto.createHash('sha256').update(block).digest('hex');
};

class Blockchain {
  constructor(dir) {
    this.path = dir;
    this.tailHash = null;
    this.nextId = 0;
    return this.#init();
  }

  async #init() {
    await fs.mkdir(this.path, { recursive: true }).catch(() => {});
    const file = path.join(this.path, BLOCKCHAIN);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) {
      this.nextId = 0;
      const record = { id: 0, prev: '0', timestamp: Date.now(), data: {} };
      this.tailHash = await this.writeBlock(record);
      this.nextId++;
      await this.writeChain();
    } else {
      const raw = await fs.readFile(file);
      const chain = JSON.parse(raw);
      this.tailHash = chain.tailHash;
      this.nextId = chain.nextId;
    }
    return this;
  }

  async writeChain() {
    const file = path.join(this.path, BLOCKCHAIN);
    const chain = { tailHash: this.tailHash, nextId: this.nextId };
    await fs.writeFile(file, JSON.stringify(chain));
  }

  async addBlock(data) {
    const id = this.nextId;
    const prev = this.tailHash;
    const timestamp = Date.now();
    const block = { id: id.toString(), prev, timestamp, data };
    const hash = await this.writeBlock(block);
    this.nextId++;
    this.tailHash = hash;
    await this.writeChain();
    return { id, hash };
  }

  async writeBlock(block) {
    const hash = calculateHash(block);
    const file = path.join(this.path, `${hash}.json`);
    await fs.writeFile(file, JSON.stringify(block));
    return hash;
  }

  async readBlock(hash) {
    const file = path.join(this.path, `${hash}.json`);
    const exists = await fs.access(file).then(...toBool);
    if (!exists) throw Error(`File not found ${file}`);
    const data = await fs.readFile(file);
    return JSON.parse(data);
  }

  async isValid({ last, from } = {}) {
    let currentHash = from || this.tailHash;
    if (!currentHash) return false;
    let count = 0;
    while (currentHash) {
      const block = await this.readBlock(currentHash);
      const expectedHash = calculateHash(block);
      if (currentHash !== expectedHash) return false;
      count++;
      if (last && count >= last) break;
      if (block.prev === '0') break;
      currentHash = block.prev;
    }
    return true;
  }
}

module.exports = Blockchain;
