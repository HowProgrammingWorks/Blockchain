'use strict';

const { Blockchain } = require('./lib/chain.js');
const { SmartContract } = require('./lib/contract.js');
const { Storage } = require('./lib/storage.js');
const { loadKeys } = require('./lib/keys.js');

const main = async () => {
  const keys = await loadKeys('./keys');

  const chain = await new Blockchain('./blockchain');
  const ready = await chain.isValid();
  console.log('🕵️  Blockchain valid:', ready);

  const storage = await new Storage('./storage', keys);

  const record1 = { value: 13.5, unit: 'm/s', precision: 0.1 };
  const record2 = { value: 13.6, unit: 'm/s', precision: 0.01 };
  const record3 = { value: 13.2, unit: 'm/s', precision: 0.001 };
  const record4 = { value: 13.4, unit: 'm/s', precision: 0.1 };

  await chain.addBlock(record1);
  await chain.addBlock(record2);
  await chain.addBlock(record3);
  await chain.addBlock(record4);

  await storage.saveData('1', record1, { entity: 'speed', encrypted: false });
  await storage.saveData('2', record2, { entity: 'speed', encrypted: true });
  await storage.saveData('3', record3, { entity: 'speed', encrypted: false });
  await storage.saveData('4', record4, { entity: 'speed', encrypted: true });

  const contract = new SmartContract(chain, async (reader, args) => {
    const lastBlock = await reader.getLastBlock();
    if (!lastBlock) throw new Error('No blocks found');
    const value = lastBlock.data.value * args.coefficient;
    const record = { ...lastBlock.data, value };
    return record;
  });

  try {
    await contract.execute({ coefficient: 2.5 });
  } catch (err) {
    console.error('Contract failed:', err);
  }

  const valid = await chain.isValid({ last: 5 });
  console.log('🕵️  Blockchain valid after adding:', valid);
};

main();
