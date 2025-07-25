'use strict';

class DataReader {
  #chain;

  constructor(blockchain) {
    this.#chain = blockchain;
  }

  async getLastBlock() {
    const hash = this.#chain.tailHash;
    return this.#chain.readBlock(hash);
  }

  async getBlock(hash) {
    return this.#chain.readBlock(hash);
  }
}

class SmartContract {
  #chain;

  constructor(blockchain, proc) {
    this.#chain = blockchain;
    this.proc = proc;
  }

  async execute(args) {
    const reader = new DataReader(this.#chain);
    try {
      const result = await this.proc(reader, args);
      await this.#chain.addBlock(result);
      return result;
    } catch (error) {
      const block = {
        contract: this.proc.name,
        args,
        error: error.message,
        timestamp: Date.now(),
      };
      await this.#chain.addBlock(block);
      throw error;
    }
  }
}

class ContractRegistry {
  #chain;

  constructor(blockchain) {
    this.#chain = blockchain;
    this.contracts = new Map();
  }
  register(name, proc) {
    this.contracts.set(name, proc);
  }
  async execute(name, args) {
    const proc = this.contracts.get(name);
    if (!proc) throw new Error('Contract not found: ' + name);
    const contract = new SmartContract(this.#chain, proc);
    return contract.execute(args);
  }
}

module.exports = { SmartContract, DataReader, ContractRegistry };
