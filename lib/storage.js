'use strict';

const fs = require('node:fs/promises');
const utils = require('./utils.js');

class Storage {
  constructor(basePath = './storage/') {
    this.records = new Map();
    this.basePath = basePath;
    return this.init();
  }

  async init() {
    await utils.ensureDirectory(this.basePath);
    return this;
  }

  async saveData(id, data, encrypted = false) {
    const filePath = `${this.basePath}${id}.json`;
    const str = JSON.stringify({ data, encrypted });
    await fs.writeFile(filePath, str);
    this.records.set(id, { path: filePath, encrypted });
  }

  async loadData(id) {
    const filePath = `${this.basePath}${id}.json`;
    const exists = await utils.exists(filePath);
    if (!exists) return [];
    const data = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(data);
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
