'use strict';

const Blockchain = require('./lib/storage.js');

const main = async () => {
  const chain = await new Blockchain('./data');
  console.log('Blockchain valid:', await chain.isValid());

  const record1 = { value: 13.5, unit: 'm/s', precision: 0.1 };
  const record2 = { value: 13.6, unit: 'm/s', precision: 0.01 };
  const record3 = { value: 13.2, unit: 'm/s', precision: 0.001 };
  const record4 = { value: 13.4, unit: 'm/s', precision: 0.1 };

  await chain.addBlock(record1);
  await chain.addBlock(record2);
  await chain.addBlock(record3);
  await chain.addBlock(record4);

  console.log('Blockchain valid after adding:', await chain.isValid());
};

main();
