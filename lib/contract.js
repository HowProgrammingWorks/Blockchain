'use strict';

class DataReader {
  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  async get(id) {
    return this.#storage.loadData(id);
  }
}

class SmartContract {
  #storage;
  #chain;
  #proc;

  constructor(name, storage, blockchain, proc) {
    this.name = name;
    this.#storage = storage;
    this.#chain = blockchain;
    this.#proc = proc;
  }

  async execute(args) {
    const reader = new DataReader(this.#storage);
    try {
      const result = await this.#proc(reader, args);
      await this.#storage.saveData(args.id, result);
      return result;
    } catch (error) {
      const contract = this.name;
      const timestamp = Date.now();
      const block = { contract, args, error: error.message, timestamp };
      await this.#chain.addBlock(block);
      throw error;
    }
  }
}

module.exports = { DataReader, SmartContract };
