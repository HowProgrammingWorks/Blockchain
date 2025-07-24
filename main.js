'use strict';

const path = require('node:path');
const { Blockchain } = require('./lib/storage.js');

const DB_PATH = './data';
const BLOCKCHAIN = path.join(DB_PATH, 'blockchain.json');

const bc = new Blockchain(BLOCKCHAIN);
bc.load();

console.log('Blockchain valid:', bc.isValid());

const record1 = { value: 13.5, unit: 'm/s', precision: 0.1 };
const record2 = { value: 13.6, unit: 'm/s', precision: 0.01 };
const record3 = { value: 13.2, unit: 'm/s', precision: 0.001 };
const record4 = { value: 13.4, unit: 'm/s', precision: 0.1 };

bc.addBlock(record1);
bc.addBlock(record2);
bc.addBlock(record3);
bc.addBlock(record4);

console.log('Blockchain:', bc.chain);
console.log('Blockchain valid after adding:', bc.isValid());
