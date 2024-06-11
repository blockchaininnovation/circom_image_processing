import fs from 'fs';

import * as util from './util.js';

const WASM_FILE = "./work/test_bytestobits/test_bytestobits_js/test_bytestobits.wasm";
const ZKEY_FILE = "./work/test_bytestobits/circuit_final.zkey";


async function execute() {
  const snarkjs = await import("snarkjs");

  const $in = [1, 85, 18, 32];
  console.log("in: ", $in.length);

  const startTime = Date.now(); // 開始時間
  const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in },
    WASM_FILE, ZKEY_FILE);
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  fs.writeFileSync('./result/' + 'bytestobits_proof.json', JSON.stringify(proof, null, '    '));
  fs.writeFile('./result/' + 'bytestobits.json', Buffer.from(publicSignals), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });

}

