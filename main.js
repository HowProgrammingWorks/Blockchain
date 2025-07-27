'use strict';

const { Blockchain } = require('./lib/chain.js');
const { SmartContract } = require('./lib/contract.js');
const { Storage } = require('./lib/storage.js');
const { loadKeys } = require('./lib/keys.js');

class Speed {
  constructor({ value, unit, precision }) {
    this.value = value;
    this.unit = unit;
    this.precision = precision;
  }
}

const main = async () => {
  const keys = await loadKeys('./keys');

  const chain = await new Blockchain('./blockchain');
  const ready = await chain.isValid();
  console.log('🕵️  Blockchain valid:', ready);

  const storage = await new Storage('./storage', chain, keys);

  const record1 = new Speed({ value: 13.5, unit: 'm/s', precision: 0.1 });
  const record2 = new Speed({ value: 13.6, unit: 'm/s', precision: 0.01 });
  const record3 = new Speed({ value: 13.2, unit: 'm/s', precision: 0.001 });
  const record4 = new Speed({ value: 13.4, unit: 'm/s', precision: 0.1 });

  await storage.saveData(100, record1, { encrypted: false });
  await storage.saveData(100, record2, { encrypted: false });
  await storage.saveData(101, record3, { encrypted: false });
  await storage.saveData(101, record4, { encrypted: false });

  const source = async (reader, args) => {
    console.log('📝 Smart contract called with args:', args);
    const record = await reader.get(args.id);
    console.log('📝 Data loaded from storage:', record);
    if (!record) throw new Error('No record found');
    const value = (record.value * args.coefficient).toFixed(record.precision);
    console.log('📝 Smart Contract record update:', { value });
    return { ...record, value };
  };

  const { hash } = await SmartContract.save('MultiplySpeed', chain, source);
  console.log('📝 Contract saved to blockchain: MultiplySpeed');

  const contract = await SmartContract.load(hash, { storage, chain });
  console.log('📝 Loaded contract from blockchain:', contract.name);

  try {
    const result = await contract.execute({ id: 100, coefficient: 2.5 });
    console.log('📝 Contract execution result:', result);
  } catch (error) {
    console.error('📝 Contract failed:', error);
  }

  const valid = await chain.isValid({ last: 10 });
  console.log('🕵️  Blockchain valid after adding:', valid);
};

main();
