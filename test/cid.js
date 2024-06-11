import fs from 'fs';
import crypto from "crypto";
import base32 from "base32.js";

import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

import { base58_to_binary } from "base58-js";

import * as util from './util.js';
import { encrypt } from "./decrypt.js";
import * as poseidon from "./poseidon.js";

const WASM_FILE = "./work/test_cid/test_cid_js/test_cid.wasm";
const ZKEY_FILE = "./work/test_cid/circuit_final.zkey";

const WASM_FILE_MATCH = "./work/test_cid_match/test_cid_match_js/test_cid_match.wasm";
const ZKEY_FILE_MATCH = "./work/test_cid_match/circuit_final.zkey";


const textEncoder = new TextEncoder();

function checkExportedCid() {
  const data = JSON.parse(fs.readFileSync('./cid.json', 'utf8'));

  // const cid = restoreCid(data[0] + data[1]);
  const cid = restoreCid("");
  console.log(cid);
}

function restoreCid(digest) {
  const cid_version = 1;
  const cid_codec = 85; // raw 0x55
  const hash_function_code = 18; // SHA-256 0x12
  const length = 32;

  const hexStr = cid_version.toString(16).padStart(2, "0") + cid_codec.toString(16).padStart(2, "0") + hash_function_code.toString(16).padStart(2, "0") + length.toString(16).padStart(2, "0") + digest;
  console.log("hexStr: ", hexStr);
  const bin = Buffer.from(hexStr, 'hex');
  console.log("bin: ", bin);
  const encoder = new base32.Encoder();
  return encoder.write(bin).finalize().toLowerCase();
}

async function execute(file) {
  const snarkjs = await import("snarkjs");

  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const $in = util.byteArrayToBytes(data);
    console.log("in: ", $in.length);

    const startTime = Date.now(); // 開始時間
    const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in, },
      WASM_FILE, ZKEY_FILE);
    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    // fs.writeFileSync('./result/' + 'cid.json', JSON.stringify(publicSignals, null, '    '));
    // fs.writeFileSync('./result/'+'cid_proof.json', JSON.stringify(proof, null, '    '));

    const hex = util.uint8ArrayToHex(publicSignals);
    const base32Str = util.bytesToBase32(publicSignals);
    console.log("hex: ", hex);
    console.log("base32Str: ", base32Str);


  })

}

export { executePoseidon }
async function executePoseidon() {
  const snarkjs = await import("snarkjs");

  // const file = './test/sampledata/white10x10.bmp';
  const file = './test/sampledata/white15x15.bmp';

  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const splits = await poseidon.splitToArrayToCalculatePoseidonHash(data);
    console.log("splits: " + splits.length);
    const hash = await poseidon.calculatePoseidonHashOfSplitArray(splits);
    console.log("hash calculated by js: " + hash + " " + util.bytesToBase32(hash) + " " + util.uint8ArrayToBigInt(hash));
    let cid_js = [1, 85, 18, 32];
    cid_js.push(...hash);

    const hex_cid_js = util.uint8ArrayToHex(cid_js);
    const base32_cid_js = util.bytesToBase32(cid_js);
    console.log("hex_cid_js: ", hex_cid_js);
    console.log("base32_cid_js: ", base32_cid_js);

    const $in = splits;
    console.log("in: ", $in.length);

    const startTime = Date.now(); // 開始時間
    const { proof, publicSignals } = await snarkjs.groth16.fullProve({ in: $in, },
      WASM_FILE, ZKEY_FILE);
    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    const hex = util.uint8ArrayToHex(publicSignals);
    const base32Str = util.bytesToBase32(publicSignals);
    console.log("hex: ", hex);
    console.log("base32Str: ", base32Str);

  })

}

async function execute_match() {
  const snarkjs = await import("snarkjs");

  const file = "./test/sampledata/white10x10_384bytes.bmp";

  const key = "b0sxrtggdhud4ymgu4ezxafwt5llao9e" //32文字
  const nonce = "kakikukeko111111"; //16文字

  const key_for_stored_encrypted_data = Buffer.from(textEncoder.encode(key));
  const nonce_for_stored_encrypted_data = Buffer.from(textEncoder.encode(nonce));

  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const encrypted_data = await encrypt(data, nonce_for_stored_encrypted_data, key_for_stored_encrypted_data);

    const $in = util.byteArrayToBytes(encrypted_data);
    const $in_cid_base32 = util.stringToByteArray(createCidOfData(encrypted_data));

    console.log("in: ", $in.length);
    console.log("in_cid_base32: ", $in_cid_base32.length);

    const startTime = Date.now(); // 開始時間
    const { proof, publicSignals } = await snarkjs.groth16.fullProve({ in: $in, in_cid_base32: $in_cid_base32 },
      WASM_FILE_MATCH, ZKEY_FILE_MATCH);
    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    fs.writeFileSync('./result/' + 'cid_match.json', JSON.stringify(publicSignals, null, '    '));
    fs.writeFileSync('./result/' + 'cid_match_proof.json', JSON.stringify(proof, null, '    '));
  })

}

async function execute_test_bytestobits() {
  const snarkjs = await import("snarkjs");

  const $in = [200, 12];
  console.log("in: ", $in.length, " ", $in);

  const startTime = Date.now(); // 開始時間
  const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in, },
    "./work/test_bytestobits/test_bytestobits_js/test_bytestobits.wasm",
    "./work/test_bytestobits/circuit_final.zkey");
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  const hex = util.uint8ArrayToHex(publicSignals);
  console.log("hex: ", hex);

  const bits = util.uint8ArrayToHex(byteArrayToBits($in));
  console.log('answer: ', bits);
  console.log('test result: ', hex == bits);
}


async function execute_test_bitstobytes() {
  const snarkjs = await import("snarkjs");

  const $in = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  console.log("in: ", $in.length, " ", $in);

  const startTime = Date.now(); // 開始時間
  const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in, },
    "./work/test_bitstobytes/test_bitstobytes_js/test_bitstobytes.wasm",
    "./work/test_bitstobytes/circuit_final.zkey");
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  const hex = util.uint8ArrayToHex(publicSignals);
  console.log("hex: ", hex);

  const bytes = util.bitsToBufferArray($in);
  const bytesHex = util.uint8ArrayToHex(bytes);
  console.log('answer: ', bytes);
  console.log('answer hex: ', bytesHex);
  console.log('test result: ', hex == bytesHex);
}


async function createCIDByMultiformats(file) {
  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const hash = await sha256.digest(data);

    // const cid = CID.create(0, 0x70, hash);

    // raw	ipld	0x55	permanent	raw binary
    const cid = CID.create(1, 0x55, hash);
    console.log("cid: ", cid.toString());


  })
}

async function createCID(file) {
  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const hash = await sha256.digest(data);
    const hashStr = util.uint8ArrayToHex(hash.digest);
    console.log("hash:", hash.length, " ", hash);
    console.log("hashStr:", hashStr);

    const cid = restoreCid(hashStr);

    console.log("cid: ", cid);

  })
}

export { createCidOfData };
function createCidOfData(data) {
  const hash = sha256.digest(data);
  const hashStr = util.uint8ArrayToHex(hash.digest);
  console.log("hash:", hash.length, " ", hash);
  console.log("hashStr:", hashStr);

  return restoreCid(hashStr);
}

export { createCidOfDataPoseidon };
async function createCidOfDataPoseidon(byteArray) {
  const hash = await poseidon.calculatePoseidonHashOfByteArray(byteArray);
  const hashStr = util.arrayToHexString(hash);
  console.log("hash poseidon:", hash.length, " ", hash);
  console.log("hashStr poseidon:", hashStr);

  // TODO 2番めはSHA256と同じ0x12が入ってしまっている．
  return restoreCid(hashStr);
}

async function decodeCidV0(cid) {
  const bin = base58_to_binary(cid);
  console.log("decoded cid v0: ", bin);
  console.log("decoded cid v0: ", Buffer.from(bin).toString("hex"));
}

async function decodeCidV1(cid) {
  const bin = util.base32ToBytes(cid);
  const uint8Array = util.bufferToUint8Array(bin);
  const hexStr = util.uint8ArrayToHex(bin);

  console.log("decoded cid v1: ", uint8Array);
  console.log("decoded cid v1: ", hexStr);
}

async function sha256OfFile(file) {
  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const hashByCrypto = crypto.createHash('sha256').update(data).digest('hex')
    console.log("hashByCrypto: ", hashByCrypto)

    const hash = await sha256.digest(data);
    console.log("hash: ", hash)
    console.log("hash: ", Buffer.from(hash.digest).toString("hex"))
  })

}
async function base32Check() {
  const code = 97;
  const ch = String.fromCharCode(code);
  console.log(ch);
  const bytes = util.base32ToBytes("a======");
  console.log(bytes);
}
