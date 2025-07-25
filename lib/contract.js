'use strict';

class SmartContract {
  #chain;
  #execute;

  constructor(blockchain, execute) {
    this.#chain = blockchain;
    this.#execute = execute;
  }

  async execute(args) {
    const result = await this.#execute(this.#chain, args);
    await this.#chain.addBlock(result);
    return result;
  }
}

module.exports = SmartContract;
