import fs from 'fs';
import crypto from "crypto";

import * as util from './util.js';

const ALGORITHM = "aes-256-ctr";

function decrypt_str(encrypted, iv, secretKey) {
  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
  const decrypted = decipher.update(encrypted);
  const finalBuffer = decipher.final();

  const ret = Buffer.concat([decrypted, finalBuffer]);
  console.log("decrypted: ", ret);
  return ret;
};

function decrypt(encrypted, iv, secretKey) {
  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
  const decrypted = decipher.update(encrypted);
  const finalBuffer = decipher.final();

  const ret = Buffer.concat([decrypted, finalBuffer]);
  console.log("decrypted: ", ret);
  return ret.toString(util.CHARSET);
};

export { encrypt_str };
function encrypt_str(plain, iv, secretKey) {
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  const encrypted = cipher.update(plain, util.CHARSET);
  const finalBuffer = cipher.final();

  return Buffer.concat([encrypted, finalBuffer]);
}
export { encrypt };
function encrypt(plain, iv, secretKey) {
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  const encrypted = cipher.update(plain);
  const finalBuffer = cipher.final();

  return Buffer.concat([encrypted, finalBuffer]);
}

const textEncoder = new TextEncoder();

async function execute() {
  const snarkjs = await import("snarkjs");

  const key = "b0sxrtggdhud4ymgu4ezxafwt5llao9e" //32文字
  const nonce = "kakikukeko111111"; //16文字

  const keyForStoredEncryptedData = Buffer.from(textEncoder.encode(key));
  const nonceForStoredEncryptedData = Buffer.from(textEncoder.encode(nonce));
  console.log("keyForStoredEncryptedData: ", keyForStoredEncryptedData);
  console.log("nonceForStoredEncryptedData: ", nonceForStoredEncryptedData);

  const storedEncryptedData = encrypt_str("12345678901234561234567890123456", nonceForStoredEncryptedData, keyForStoredEncryptedData);   // storedEncryptedDataSize bits
  console.log("storedEncryptedData: ", storedEncryptedData, " ", storedEncryptedData.length);

  const decryptedForDebug = decrypt_str(storedEncryptedData, nonceForStoredEncryptedData, keyForStoredEncryptedData)
  console.log("decryptedForDebug: ", decryptedForDebug);

  const storedEncryptedDataBits = util.byteArrayToBits(storedEncryptedData);
  const keyForStoredEncryptedDataBits = util.byteArrayToBits(keyForStoredEncryptedData);
  const nonceForStoredEncryptedDataBits = util.byteArrayToBits(nonceForStoredEncryptedData);

  console.log("storedEncryptedDataBits: ", storedEncryptedDataBits.length);
  console.log("keyForStoredEncryptedDataBits: ", keyForStoredEncryptedDataBits.length);
  console.log("nonceForStoredEncryptedDataBits: ", nonceForStoredEncryptedDataBits.length);

  const startTime = Date.now(); // 開始時間
  const { proof, publicSignals } = await snarkjs.plonk.fullProve({
    storedEncryptedData: util.paddingZero(storedEncryptedDataBits, 256),
    keyForStoredEncryptedData: keyForStoredEncryptedDataBits,
    nonceForStoredEncryptedData: nonceForStoredEncryptedDataBits,
  },
    "./work/decrypt/decrypt_js/decrypt.wasm",
    "./work/decrypt/circuit_final.zkey");
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  fs.writeFileSync('./result/' + 'decrypt.json', JSON.stringify(publicSignals, null, '    '));
  fs.writeFileSync('./result/' + 'decrypt_proof.json', JSON.stringify(proof, null, '    '));

  const result = util.bitsToBufferArray(publicSignals);

  console.log("result: ", result);
  console.log("resultStr: ", result.toString(util.CHARSET));

}


async function execute_image() {
  const snarkjs = await import("snarkjs");

  const key = "b0sxrtggdhud4ymgu4ezxafwt5llao9e" //32文字
  const nonce = "kakikukeko111111"; //16文字

  const keyForStoredEncryptedData = Buffer.from(textEncoder.encode(key));
  const nonceForStoredEncryptedData = Buffer.from(textEncoder.encode(nonce));
  console.log("keyForStoredEncryptedData: ", keyForStoredEncryptedData);
  console.log("nonceForStoredEncryptedData: ", nonceForStoredEncryptedData);

  const file = "./test/sampledata/white10x10_384bytes.bmp";
  const data = fs.readFileSync(file);
  console.log("data:", data.length, " ", data);

  const storedEncryptedData = encrypt(data, nonceForStoredEncryptedData, keyForStoredEncryptedData);   // storedEncryptedDataSize bits
  console.log("storedEncryptedData: ", storedEncryptedData, " ", storedEncryptedData.length);

  const decryptedForDebug = decrypt(storedEncryptedData, nonceForStoredEncryptedData, keyForStoredEncryptedData)
  console.log("decryptedForDebug: ", decryptedForDebug);

  const storedEncryptedDataBits = util.byteArrayToBits(storedEncryptedData);
  const keyForStoredEncryptedDataBits = util.byteArrayToBits(keyForStoredEncryptedData);
  const nonceForStoredEncryptedDataBits = util.byteArrayToBits(nonceForStoredEncryptedData);

  console.log("storedEncryptedDataBits: ", storedEncryptedDataBits.length);
  console.log("keyForStoredEncryptedDataBits: ", keyForStoredEncryptedDataBits.length);
  console.log("nonceForStoredEncryptedDataBits: ", nonceForStoredEncryptedDataBits.length);

  const startTime = Date.now(); // 開始時間
  const { proof, publicSignals } = await snarkjs.plonk.fullProve({
    storedEncryptedData: util.paddingZero(storedEncryptedDataBits, 256),
    keyForStoredEncryptedData: keyForStoredEncryptedDataBits,
    nonceForStoredEncryptedData: nonceForStoredEncryptedDataBits,
  },
    "./work/decrypt/decrypt_js/decrypt.wasm",
    "./work/decrypt/circuit_final.zkey");
  const endTime = Date.now(); // 終了時間
  console.log("result :", publicSignals);
  console.log(endTime - startTime, " [ms]");

  fs.writeFileSync('./result/' + 'decrypt_image.json', JSON.stringify(publicSignals, null, '    '));
  fs.writeFileSync('./result/' + 'decrypt_image_proof.json', JSON.stringify(proof, null, '    '));
  fs.writeFile('./result/' + 'decrypt_image.bmp', Buffer.from(publicSignals), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
  const result = util.bitsToBufferArray(publicSignals);

  console.log("result: ", result);
  console.log("resultStr: ", result.toString(util.CHARSET));

}
