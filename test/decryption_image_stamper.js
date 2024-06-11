import fs from 'fs';
import { readFileSync, statSync } from 'fs';
import { genKeypair } from 'maci-crypto'
import * as circomlibjs from 'circomlibjs';
const { buildPoseidon } = circomlibjs;

import * as util from './util.js';

import { createCidOfData, createCidOfDataPoseidon } from "./cid.js";
import { encrypt } from "./decrypt.js";
import { createCharMap, createCircomInput, createCircomInputWholeBmp } from "./image.js";
import { genRandomNonce, poseidonEncrypt, calculatePoseidonHashNumberOfSplitArray, splitToArrayToCalculatePoseidonHash } from './poseidon.js';

const WASM_FILE = "./work/test_decryption_image_stamper/test_decryption_image_stamper_js/test_decryption_image_stamper.wasm";
const ZKEY_FILE = "./work/test_decryption_image_stamper/circuit_final.zkey";

const WASM_FILE_POSEIDON = "./work/test_decryption_image_stamper_poseidon/test_decryption_image_stamper_poseidon_js/test_decryption_image_stamper_poseidon.wasm";
const ZKEY_FILE_POSEIDON = "./work/test_decryption_image_stamper_poseidon/circuit_final.zkey";


const textEncoder = new TextEncoder();

export { execute };
async function execute() {
  const snarkjs = await import("snarkjs");

  const file = "./test/sampledata/white10x10_384bytes.bmp";
  // const file = "./test/sampledata/000001-1_16x.bmp";
  // const file = "./test/sampledata/white500x500_16x.bmp";
  // const file = "./test/sampledata/white500x200_16x.bmp";
  // const file = "./test/sampledata/white30x30_16x.bmp";
  // const file = "./test/sampledata/white60x30_16x.bmp";

  const key = "b0sxrtggdhud4ymgu4ezxafwt5llao9e" //32文字
  const nonce = "kakikukeko111111"; //16文字

  const key_for_encrypted_data = Buffer.from(textEncoder.encode(key));
  const nonce_for_encrypted_data = Buffer.from(textEncoder.encode(nonce));
  console.log("key_for_encrypted_data: ", key_for_encrypted_data);
  console.log("nonce_for_encrypted_data: ", nonce_for_encrypted_data);

  const charset = await createCharMap('./test/sampledata/misaki_4x8.png');

  const data = fs.readFileSync(file);
  console.log("data:", data.length, " ", data);

  const encrypted_data = await encrypt(data, nonce_for_encrypted_data, key_for_encrypted_data);

  const $key_for_encrypted_data_bits = util.byteArrayToBits(key_for_encrypted_data);
  const $nonce_for_encrypted_data_bits = util.byteArrayToBits(nonce_for_encrypted_data);

  const $cid = util.stringToByteArray(createCidOfData(encrypted_data));

  const $encrypted_data = util.byteArrayToBytes(encrypted_data);
  const black_and_white = await createCircomInput(file, charset);
  const $black_image_idx = black_and_white[0];
  const $white_image_idx = black_and_white[1];

  console.log("$cid: " + $cid.length + " " + Array.isArray($cid));
  console.log("$encrypted_data: " + $encrypted_data.length + " " + Array.isArray($encrypted_data));
  console.log("$key_for_encrypted_data_bits: ", $key_for_encrypted_data_bits.length + " " + Array.isArray($key_for_encrypted_data_bits));
  console.log("$nonce_for_encrypted_data_bits: ", $nonce_for_encrypted_data_bits.length + " " + Array.isArray($nonce_for_encrypted_data_bits));
  console.log("$black_image_idx: ", $black_image_idx.length + " " + Array.isArray($black_image_idx));
  console.log("$white_image_idx: ", $white_image_idx.length + " " + Array.isArray($white_image_idx));
  const startTime = Date.now(); // 開始時間

  const { proof, publicSignals } = await snarkjs.groth16.fullProve({
    // const { proof, publicSignals } = await snarkjs.plonk.fullProve({
    cid: $cid, encrypted_data: $encrypted_data,
    key_for_encrypted_data: $key_for_encrypted_data_bits,
    nonce_for_encrypted_data: $nonce_for_encrypted_data_bits,
    black_image_idx: $black_image_idx, white_image_idx: $white_image_idx
  },
    WASM_FILE, ZKEY_FILE);
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  fs.writeFileSync('./result/' + 'image_proof.json', JSON.stringify(proof, null, '    '));
  fs.writeFile('./result/' + 'image.bmp', Buffer.from(publicSignals), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });

}


export { executeByFilter };
async function executeByFilter(file) {
  const snarkjs = await import("snarkjs");

  // const file = "./test/sampledata/white10x10_384bytes.bmp";
  // const file = "./test/sampledata/000001-1_16x.bmp";
  // const file = "./test/sampledata/white500x500_16x.bmp";
  // const file = "./test/sampledata/white500x200_16x.bmp";
  // const file = "./test/sampledata/white30x30_16x.bmp";
  // const file = "./test/sampledata/white60x30_16x.bmp";

  const key = "b0sxrtggdhud4ymgu4ezxafwt5llao9e" //32文字
  const nonce = "kakikukeko111111"; //16文字

  const key_for_encrypted_data = Buffer.from(textEncoder.encode(key));
  const nonce_for_encrypted_data = Buffer.from(textEncoder.encode(nonce));
  console.log("key_for_encrypted_data: ", key_for_encrypted_data);
  console.log("nonce_for_encrypted_data: ", nonce_for_encrypted_data);

  const charset = await createCharMap('./test/sampledata/misaki_4x8.png');

  const data = fs.readFileSync(file);
  console.log("data:", data.length, " ", data);

  const encrypted_data = await encrypt(data, nonce_for_encrypted_data, key_for_encrypted_data);

  const $key_for_encrypted_data_bits = util.byteArrayToBits(key_for_encrypted_data);
  const $nonce_for_encrypted_data_bits = util.byteArrayToBits(nonce_for_encrypted_data);

  const $cid = util.stringToByteArray(createCidOfData(encrypted_data));

  const $encrypted_data = util.byteArrayToBytes(encrypted_data);
  const $filter = await createCircomInputWholeBmp(file, charset);

  console.log("$cid: " + $cid.length + " " + Array.isArray($cid) + " " + $cid);
  console.log("$encrypted_data: " + $encrypted_data.length + " " + Array.isArray($encrypted_data));
  console.log("$key_for_encrypted_data_bits: ", $key_for_encrypted_data_bits.length + " " + Array.isArray($key_for_encrypted_data_bits));
  console.log("$nonce_for_encrypted_data_bits: ", $nonce_for_encrypted_data_bits.length + " " + Array.isArray($nonce_for_encrypted_data_bits));
  console.log("$filter: ", $filter.length + " " + Array.isArray($filter));
  const startTime = Date.now(); // 開始時間

  const { proof, publicSignals } = await snarkjs.groth16.fullProve({
    // const { proof, publicSignals } = await snarkjs.plonk.fullProve({
    cid: $cid, encrypted_data: $encrypted_data,
    key_for_encrypted_data: $key_for_encrypted_data_bits,
    nonce_for_encrypted_data: $nonce_for_encrypted_data_bits,
    filter: $filter
  },
    WASM_FILE, ZKEY_FILE);
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log("proof gen time: ", endTime - startTime, " [ms]");

  const fileNameOnly = util.extractFileName(file);
  fs.writeFileSync('./result/' + fileNameOnly + '.proof.json', JSON.stringify(proof, null, '    '));
  fs.writeFileSync('./result/' + fileNameOnly + '.publicSignals.json', JSON.stringify(publicSignals, null, '    '));

  const decrypted_data_size = data.length;
  if (decrypted_data_size < publicSignals.length) {
    const result_cid = publicSignals.slice(decrypted_data_size, decrypted_data_size + $cid.length);
    const result_filter = publicSignals.slice(decrypted_data_size + $cid.length, publicSignals.length);
    fs.writeFileSync('./result/' + fileNameOnly + '.cid.json', result_cid.toString());
    fs.writeFileSync('./result/' + fileNameOnly + '.filter.json', JSON.stringify(result_filter, null, '    '));
  }

  fs.writeFile('./result/' + fileNameOnly + '.edit.bmp', Buffer.from(publicSignals), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
    process.exit(0);
  });

}



export { executeByFilterPoseidon };
async function executeByFilterPoseidon(filename) {
  const snarkjs = await import("snarkjs");

  // const filename = "./test/sampledata/white10x10.bmp";
  // const filename = "./test/sampledata/white10x10_384bytes.bmp";
  // const filename = "./test/000001-1_16x.bmp";
  // const filename = "./test/sampledata/white500x500_16x.bmp";
  // const filename = "./test/sampledata/white500x200_16x.bmp";
  // const filename = "./test/sampledata/white30x30_16x.bmp";
  // const filename = "./test/sampledata/white60x30_16x.bmp"
  // const filename = "./test/sampledata/white60x60_16x.bmp"
  // const filename = "./test/sampledata/white120x60.bmp"

  var stat = statSync(filename);
  console.log("filesize: " + stat.size);

  const bytes = util.readFileAsUint8Array(filename);
  console.log("data length: " + typeof (bytes[0]) + " " + bytes.length);

  const keypair = genKeypair();
  console.log("keypair=" + keypair.pubKey);
  const nonce = genRandomNonce();
  console.log("nonce=" + nonce);

  var startTime = Date.now();
  const encrypted = await poseidonEncrypt(bytes, keypair.pubKey, nonce);
  var endTime = Date.now();
  console.log("encrypted time: " + (endTime - startTime) + " [ms]");

  console.log("encrypted length: " + typeof (encrypted[0]) + " " + encrypted.length);


  startTime = Date.now();
  var totalarray = [];
  for (let i = 0; i < encrypted.length; i++) {
    const e = encrypted[i];
    const arr = util.bigIntToUint8Array(e);
    totalarray = [...totalarray, ...arr];
  }
  console.log("totalarray length: " + typeof (totalarray[0]) + " " + totalarray.length);

  endTime = Date.now();
  console.log("convert time: " + (endTime - startTime) + " [ms]");

  const $cid = util.stringToByteArray(await createCidOfDataPoseidon(totalarray));

  const $encrypted_data = util.byteArrayToBytes(encrypted);

  const charset = await createCharMap('./test/sampledata/misaki_4x8.png');
  var $filter = await createCircomInputWholeBmp(filename, charset);

  const $key_for_encrypted_data = keypair.pubKey;
  const $nonce_for_encrypted_data = nonce;
  const $encrypted_data_split16_for_poseidon_hash = split16;

  var decrypted_data_size = bytes.length;
  while (decrypted_data_size % 3 != 0) {
    decrypted_data_size += 1;
  }
  $filter = util.paddingZero($filter, decrypted_data_size);

  console.log("$cid: " + $cid.length + " " + Array.isArray($cid));
  console.log("$encrypted_data: " + $encrypted_data.length + " " + Array.isArray($encrypted_data));
  console.log("$key_for_encrypted_data: " + $key_for_encrypted_data.length + " " + Array.isArray($key_for_encrypted_data));
  console.log("$nonce_for_encrypted_data: ", $nonce_for_encrypted_data);
  console.log("$encrypted_data_split16_for_poseidon_hash: " + $encrypted_data_split16_for_poseidon_hash.length + " " + Array.isArray($encrypted_data_split16_for_poseidon_hash));
  console.log("$filter: ", $filter.length + " " + Array.isArray($filter));
  startTime = Date.now(); // 開始時間

  const { proof, publicSignals } = await snarkjs.groth16.fullProve({
    cid: $cid,
    encrypted_data: $encrypted_data,
    key_for_encrypted_data: $key_for_encrypted_data,
    nonce_for_encrypted_data: $nonce_for_encrypted_data,
    encrypted_data_split16_for_poseidon_hash: $encrypted_data_split16_for_poseidon_hash,
    filter: $filter
  },
    WASM_FILE_POSEIDON, ZKEY_FILE_POSEIDON);
  endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log("proof gen time: ", endTime - startTime, " [ms]");

  const fileNameOnly = util.extractFileName(filename);
  fs.writeFileSync('./result/' + fileNameOnly + '.poseidon.proof.json', JSON.stringify(proof, null, '    '));
  fs.writeFile('./result/' + fileNameOnly + '.poseidon.edit.bmp', Buffer.from(publicSignals), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
    process.exit(0);
  });

}


export { executeByFilterPoseidonByNumber };
async function executeByFilterPoseidonByNumber(filename) {
  const snarkjs = await import("snarkjs");

  var stat = statSync(filename);
  console.log("filesize: " + stat.size);

  const bytes = util.readFileAsUint8Array(filename);
  console.log("data length: " + typeof (bytes[0]) + " " + bytes.length);

  const keypair = genKeypair();
  console.log("keypair=" + keypair.pubKey);
  const nonce = genRandomNonce();
  console.log("nonce=" + nonce);

  var startTime = Date.now();
  const encrypted = await poseidonEncrypt(bytes, keypair.pubKey, nonce);
  var endTime = Date.now();
  console.log("encrypted time: " + (endTime - startTime) + " [ms]");

  console.log("encrypted length: " + typeof (encrypted[0]) + " " + encrypted.length);


  startTime = Date.now();
  var totalarray = [];
  for (let i = 0; i < encrypted.length; i++) {
    const e = encrypted[i];
    const arr = util.bigIntToUint8Array(e);
    totalarray = [...totalarray, ...arr];
  }
  console.log("totalarray length: " + typeof (totalarray[0]) + " " + totalarray.length);

  endTime = Date.now();
  console.log("convert time: " + (endTime - startTime) + " [ms]");

  const $encrypted_data = util.byteArrayToBytes(encrypted);
  const splits = splitToArrayToCalculatePoseidonHash($encrypted_data);
  const $cid_hash_number = await calculatePoseidonHashNumberOfSplitArray(splits);

  const charset = await createCharMap('./test/sampledata/misaki_4x8.png');
  var $filter = await createCircomInputWholeBmp(filename, charset);

  const $key_for_encrypted_data = keypair.pubKey;
  const $nonce_for_encrypted_data = nonce;
  const $encrypted_data_split_for_poseidon_hash = splits;

  var decrypted_data_size = bytes.length;
  while (decrypted_data_size % 3 != 0) {
    decrypted_data_size += 1;
  }
  $filter = util.paddingZero($filter, decrypted_data_size);

  console.log("$cid_hash_number: " + $cid_hash_number);
  console.log("$encrypted_data: " + $encrypted_data.length + " " + Array.isArray($encrypted_data));
  console.log("$key_for_encrypted_data: " + $key_for_encrypted_data.length + " " + Array.isArray($key_for_encrypted_data));
  console.log("$nonce_for_encrypted_data: ", $nonce_for_encrypted_data);
  console.log("$encrypted_data_split_for_poseidon_hash: " + $encrypted_data_split_for_poseidon_hash.length + " " + Array.isArray($encrypted_data_split_for_poseidon_hash));
  console.log("$filter: ", $filter.length + " " + Array.isArray($filter));
  startTime = Date.now(); // 開始時間

  const { proof, publicSignals } = await snarkjs.groth16.fullProve({
    cid_hash_number: $cid_hash_number,
    encrypted_data: $encrypted_data,
    key_for_encrypted_data: $key_for_encrypted_data,
    nonce_for_encrypted_data: $nonce_for_encrypted_data,
    encrypted_data_split_for_poseidon_hash: $encrypted_data_split_for_poseidon_hash,
    filter: $filter
  },
    WASM_FILE_POSEIDON, ZKEY_FILE_POSEIDON);
  endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log("proof gen time: ", endTime - startTime, " [ms]");

  const result_img = publicSignals.slice(0, decrypted_data_size);

  const fileNameOnly = util.extractFileName(filename);
  fs.writeFileSync('./result/' + fileNameOnly + '.poseidon.proof.json', JSON.stringify(proof, null, '    '));
  fs.writeFileSync('./result/' + fileNameOnly + '.poseidon.publicSignals.json', JSON.stringify(publicSignals, null, '    '));

  if (decrypted_data_size < publicSignals.length) {
    const result_cid_hash_number = publicSignals.slice(decrypted_data_size, decrypted_data_size + 1);
    const result_filter = publicSignals.slice(decrypted_data_size + 1, publicSignals.length);
    fs.writeFileSync('./result/' + fileNameOnly + '.poseidon.cid_hash.json', result_cid_hash_number.toString());
    fs.writeFileSync('./result/' + fileNameOnly + '.poseidon.filter.json', JSON.stringify(result_filter, null, '    '));
  }
  fs.writeFile('./result/' + fileNameOnly + '.poseidon.edit.bmp', Buffer.from(result_img), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
    process.exit(0);
  });

}

