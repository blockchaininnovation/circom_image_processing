import fs from 'fs';
import crypto from "crypto";
import base32 from "base32.js";

import * as util from './util.js';


const WASM_FILE = "./work/test_base32/test_base32_js/test_base32.wasm";
const ZKEY_FILE = "./work/test_base32/circuit_final.zkey";


async function execute() {
  const snarkjs = await import("snarkjs");

  const cid = "afkreib3tjtsko352yksa5s74nk4f3cfo5lknd4tvrnk4zox466t6vkbqe";


  const $in = util.stringToByteArray(cid);
  console.log("in: ", $in.length, " ", $in);

  const startTime = Date.now(); // 開始時間
  const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in, },
    WASM_FILE, ZKEY_FILE);
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  const fileNameOnly = util.extractFileName(filename);
  fs.writeFileSync('./result/' + 'base32.json', JSON.stringify(publicSignals, null, '    '));
  fs.writeFileSync('./result/' + 'base32_proof.json', JSON.stringify(proof, null, '    '));

  const result = util.uint8ArrayToHex(publicSignals);

  console.log("result: ", result);
}

function n() {
  const m = 64;
  const n = 5 * m / 8 - 4;
  console.log('n: ', n);
}
function m() {
  const n = 36;
  const m = 8 * ((n + 4) / 5);
  console.log('m: ', m);
}

async function base32Check() {
  const code = 97;
  const ch = String.fromCharCode(code);
  console.log(ch);
  const bytes = util.base32ToBytes("a======");
  console.log(bytes);
}

async function base32CheckCid() {
  const cid = "afkreib3tjtsko352yksa5s74nk4f3cfo5lknd4tvrnk4zox466t6vkbqe";
  console.log(cid);
  const bytes = util.base32ToBytes(cid);
  console.log('length: ', bytes.length, ' ', util.uint8ArrayToHex(bytes));
}

