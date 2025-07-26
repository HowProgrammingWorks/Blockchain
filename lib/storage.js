'use strict';

const fs = require('node:fs/promises');
const utils = require('./utils.js');
const path = require('node:path');
const { encrypt, decrypt } = require('./keys.js');
const { calculateHash } = require('./chain.js');

class Storage {
  #basePath;
  #keys;
  #chain;

  constructor(basePath, blockchain, keys = {}) {
    this.#basePath = basePath;
    this.#chain = blockchain;
    this.#keys = keys;
    return this.#init();
  }

  async #init() {
    await utils.ensureDirectory(this.#basePath);
    return this;
  }

  async saveData(id, data, options = {}) {
    const { encrypted = false } = options;
    const record = encrypted ? encrypt(data, this.#keys.publicKey) : data;
    const timestamp = Date.now();

    const hash = calculateHash(record);
    const block = await this.#chain.addBlock({ id, hash });

    const entry = { data: record, encrypted, timestamp, block: block.hash };
    const filePath = path.join(this.#basePath, `${id}.json`);
    const raw = JSON.stringify(entry);
    await fs.writeFile(filePath, raw);
  }

  async loadData(id) {
    const filePath = path.join(this.#basePath, `${id}.json`);
    const exists = await utils.exists(filePath);
    if (!exists) return null;
    const raw = await fs.readFile(filePath, { encoding: 'utf8' });
    const { data, encrypted, block } = JSON.parse(raw);
    const isValid = await this.validate(id, data, block);
    if (!isValid) throw new Error(`Storage record ${id} is invalid`);
    return encrypted ? decrypt(data, this.#keys.privateKey) : data;
  }

  async validate(id, data, blockHash) {
    try {
      const block = await this.#chain.readBlock(blockHash);
      const expectedHash = calculateHash(data);
      if (!block) return false;
      return block.data.hash === expectedHash && block.data.id === id;
    } catch {
      return false;
    }
  }
}

const checkCondition = (value, condition) => {
  if (typeof condition === 'string') {
    if (condition.includes('..')) {
      const [min, max] = condition.split('..').map(Number);
      return value >= min && value <= max;
    }
    const operators = ['<=', '>=', '<', '>', '='];
    for (const op of operators) {
      if (condition.startsWith(op)) {
        const number = parseFloat(condition.replace(op, '').trim());
        if (op === '<') return value < number;
        if (op === '>') return value > number;
        if (op === '<=') return value <= number;
        if (op === '>=') return value >= number;
        if (op === '=') return value === number;
      }
    }
    return value === condition;
  }
  if (Array.isArray(condition)) return condition.includes(value);
  if (condition.includes) return value.includes(condition.includes);
  if (condition.in) return condition.in.includes(value);
  return false;
};

const applyFilters = (collection, where) => {
  console.log({ filter: { collection, where } });
  const keys = Object.keys(where);
  const check = (record) => (key) => checkCondition(record[key], where[key]);
  return collection.data.filter((record) => keys.every(check(record)));
};

const applySorting = (collection, field, order) => {
  const compare = (a, b) => {
    const af = a[field];
    const bf = b[field];
    return order === 'desc' ? bf - af : af - bf;
  };
  return collection.sort(compare);
};

const applyGrouping = (collection, groupBy, aggregate) => {
  const groups = {};
  collection.forEach((record) => {
    const key = record[groupBy];
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  });

  return Object.keys(groups).map((group) => {
    const aggregated = { [groupBy]: group };
    Object.keys(aggregate).forEach((field) => {
      const [operation, column] = aggregate[field].split(' ');
      if (operation === 'count') aggregated[field] = groups[group].length;
      if (operation === 'sum') {
        const reducer = (sum, rec) => sum + rec[column];
        aggregated[field] = groups[group].reduce(reducer, 0);
      }
    });
    return aggregated;
  });
};

class Query {
  constructor(storage) {
    this.storage = storage;
  }

  async execute(query) {
    let collection = await this.storage.loadData(query.find);
    if (!collection) return [];
    if (query.where) collection = applyFilters(collection, query.where);
    if (query.sortBy) {
      collection = applySorting(collection, query.sortBy, query.order);
    }
    if (query.groupBy) {
      return applyGrouping(collection, query.groupBy, query.aggregate);
    }
    if (query.limit) collection = collection.slice(0, query.limit);
    return collection;
  }
}

module.exports = { Storage, Query };
