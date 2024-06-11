import fs from 'fs';

// Import the required modules
import assert from 'assert';
import * as circomlib from 'circomlib';
import * as circomlibjs from 'circomlibjs';
import crypto from 'crypto';
import * as ff from 'ffjavascript';
import { readFileSync, statSync } from 'fs';
import { genKeypair } from 'maci-crypto'

import * as util from './util.js';

const { Scalar, ZqField } = ff;
const { unstringifyBigInts, leBuff2int } = ff.utils;
const { babyJub, eddsa, buildPoseidon } = circomlibjs;

// Constants and field setup
const SNARK_FIELD_SIZE = BigInt('0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001');
const F = new ZqField(Scalar.fromString(SNARK_FIELD_SIZE.toString()));
const two128 = F.e('340282366920938463463374607431768211456');

// Generate a random nonce
export { genRandomNonce };
const genRandomNonce = () => {
    const max = two128;
    const lim = F.e('0x10000000000000000000000000000000000000000000000000000000000000000');
    const min = F.mod(F.sub(lim, max), max);

    let rand;
    while (true) {
        rand = BigInt('0x' + crypto.randomBytes(32).toString('hex'));
        if (rand >= min) {
            break;
        }
    }

    const privKey = F.mod(F.e(rand), max);
    assert(privKey < max);
    return privKey;
};

// Poseidon encryption function
export { poseidonEncrypt };
const poseidonEncrypt = async (msg, sharedKey, nonce) => {
    msg = Array.from(msg).map(x => BigInt(x));

    msg = msg.map(x => F.e(x));
    assert(nonce < two128);
    const message = [...msg];
    while (message.length % 3 > 0) {
        message.push(F.zero);
    }

    let cipherLength = message.length;
    let state = [
        F.zero,
        F.e(sharedKey[0]),
        F.e(sharedKey[1]),
        F.add(F.e(nonce), F.mul(F.e(msg.length), two128)),
    ];

    const ciphertext = [];
    const poseidonEx = await buildPoseidon();
    for (let i = 0; i < cipherLength / 3; i++) {
        state = poseidonEx(state.slice(1), state[0], 4).map(x => poseidonEx.F.toObject(x));
        state[1] = F.add(state[1], BigInt(message[i * 3]));
        state[2] = F.add(state[2], BigInt(message[i * 3 + 1]));
        state[3] = F.add(state[3], BigInt(message[i * 3 + 2]));

        ciphertext.push(state[1], state[2], state[3]);
    }

    state = poseidonEx(state.slice(1), state[0], 4).map(x => poseidonEx.F.toObject(x));
    ciphertext.push(state[1]);
    return ciphertext;
};

// Poseidon decryption function
const poseidonDecrypt = async (ciphertext, sharedKey, nonce, length) => {
    assert(nonce < two128);
    let state = [
        F.zero,
        F.e(sharedKey[0]),
        F.e(sharedKey[1]),
        F.add(F.e(nonce), F.mul(F.e(length), two128)),
    ];

    const message = [];
    const poseidonEx = await buildPoseidon();
    let n = Math.floor(ciphertext.length / 3);

    for (let i = 0; i < n; i++) {
        state = poseidonEx(state.slice(1), state[0], 4).map(x => poseidonEx.F.toObject(x));
        message.push(F.sub(ciphertext[i * 3], state[1]), F.sub(ciphertext[i * 3 + 1], state[2]), F.sub(ciphertext[i * 3 + 2], state[3]));
        state[1] = ciphertext[i * 3];
        state[2] = ciphertext[i * 3 + 1];
        state[3] = ciphertext[i * 3 + 2];
    }

    if (length > 3) {
        if (length % 3 === 2) {
            assert(F.eq(message[message.length - 1], F.zero));
        } else if (length % 3 === 1) {
            assert(F.eq(message[message.length - 1], F.zero));
            assert(F.eq(message[message.length - 2], F.zero));
        }
    }

    state = poseidonEx(state.slice(1), state[0], 4).map(x => poseidonEx.F.toObject(x));
    assert(F.eq(ciphertext[ciphertext.length - 1], state[1]));
    var ret = message.slice(0, length);

    ret = Array.from(ret).map(x => Number(x));
    return ret;
};

// Hash function for up to 2 elements
const poseidonT3 = inputs => {
    assert(inputs.length === 2);
    return circomlib.poseidon(inputs);
};

// Hash a single BigInt
const hashOne = preImage => {
    return poseidonT3([preImage, BigInt(0)]);
};

// Convert BigInt to Buffer
const bigInt2Buffer = i => {
    return Buffer.from(i.toString(16), 'hex');
};

// Format private key for BabyJub
const formatPrivKeyForBabyJub = privKey => {
    const sBuff = eddsa.pruneBuffer(bigInt2Buffer(hashOne(privKey)).slice(0, 32));
    const s = leBuff2int(sBuff);
    return ff.Scalar.shr(s, 3);
};

// Generate ECDH shared key
const genEcdhSharedKey = (privKey, pubKey) => {
    return babyJub.mulPointEscalar(pubKey, formatPrivKeyForBabyJub(privKey));
};

// Get signal by name
const getSignalByName = (circuit, witness, signalName) => {
    return witness[circuit.symbols[signalName].varIdx].toString();
};

// Export functions if needed
// You can uncomment these lines if you want to use them as a module
// export {
//     poseidonEncrypt,
//     poseidonDecrypt,
//     genEcdhSharedKey,
//     genRandomNonce,
//     getSignalByName,
// };

export { calculatePoseidonHash };
async function calculatePoseidonHash(splitted16) {
    const number = await calculatePoseidonHashNumber(splitted16);
    ret = await poseidonNumberToHash(number);
    console.log("hash: " + ret.length + " " + ret);
    return ret
}

export { calculatePoseidonHashNumber };
async function calculatePoseidonHashNumber(splitted16) {
    const poseidon = await buildPoseidon();
    const res1 = poseidon(splitted16);
    const res2 = poseidon.F.toObject(res1);
    console.log("hashnumber: " + res2);
    return res2;
}

export { poseidonNumberToHash };
async function poseidonNumberToHash(number) {
    const ret = util.bigIntToUint8Array(number);
    return ret;
}

export { calculatePoseidonHashNumberOfSplitArray };
async function calculatePoseidonHashNumberOfSplitArray(splits) {
    if ((splits.length - 16) % 15 != 0) {
        throw RangeError("splits.length is invalid: " + splits.length);
    }

    let index = 0;
    let iteration = 0;
    var hashn;
    while (index < splits.length) {
        // 最初のループでは16個、以降は15個の要素で分割
        const size = iteration === 0 ? 16 : 15;
        const part = splits.slice(index, index + size);
        if (iteration > 0) {
            part.push(hashn);
        }

        for (let i = 0; i < part.length; i++) {
            const p = part[i];
            if (p >= SNARK_FIELD_SIZE) {
                throw RangeError("number is out of range: " + i + " " + p);
            }
        }
        console.log("Iteration " + iteration + ": " + part.length);

        hashn = await calculatePoseidonHashNumber(part);

        // 次の分割開始位置とイテレーション数を更新
        index += size;
        iteration++;
    }

    return hashn;
}

export { calculatePoseidonHashOfSplitArray };
async function calculatePoseidonHashOfSplitArray(splits) {
    let hashn = await calculatePoseidonHashNumberOfSplitArray(splits);
    return await poseidonNumberToHash(hashn);
}

export { calculatePoseidonHashNumberOfByteArray };
async function calculatePoseidonHashNumberOfByteArray(byteArray) {
    const splits = splitToArrayToCalculatePoseidonHash(byteArray);
    return await calculatePoseidonHashNumberOfSplitArray(splits);
}

export { calculatePoseidonHashOfByteArray };
async function calculatePoseidonHashOfByteArray(byteArray) {
    const splits = splitToArrayToCalculatePoseidonHash(byteArray);
    return await calculatePoseidonHashOfSplitArray(splits);
}

export { calculatePoseidonHashOfFile };
async function calculatePoseidonHashOfFile() {
    const filename = "./test/sampledata/white10x10.bmp";
    const bytes = util.readFileAsUint8Array(filename);

    const hash = await calculatePoseidonHashOfByteArray(bytes);

    console.log('hash: ' + hash);
}

export { encryptAndDecryptoOfFile };
async function encryptAndDecryptoOfFile(filename) {
    // const filename = "./test/sampledata/white10x10.bmp";
    // const filename = "./test/sampledata/white500x200_16x.bmp";
    console.log("start " + filename);
    const bytes = util.readFileAsUint8Array(filename);
    console.log("data: " + typeof (bytes[0]) + " " + bytes.length);// + " " + bytes);

    const keypair = genKeypair();
    const nonce = genRandomNonce();
    const encrypted = await poseidonEncrypt(bytes, keypair.pubKey, nonce);
    console.log("encrypted: " + typeof (encrypted[0]) + " " + encrypted.length);// + " " + encrypted);
    // for (let i = 0; i < encrypted.length; i++) {
    //     const e = encrypted[i];
    //     console.log("encrypted: " + i + " " + e.toString().length + " " + e);
    // }
    const decrypted = await poseidonDecrypt(encrypted, keypair.pubKey, nonce, bytes.length);
    console.log("decrypted: " + typeof (decrypted[0]) + " " + decrypted.length);// + " " + decrypted);

    // for (let i = 0; i < bytes.length; i++) {
    //     if (bytes[i] !== decrypted[i]) {
    //         console.log(keypair, nonce, bytes, ciphertext)
    //     }
    // }
    if (bytes.length != decrypted.length) {
        console.log("Length are not matched: " + bytes.length + " " + decrypted.length);
    }
}

function splitToNumbersWithinField(byteArray) {
    // 31バイトずつに分割して，それぞれをBigIntに変換
    let numbers = [];
    for (let firstIdx = 0; firstIdx < byteArray.length; firstIdx = firstIdx + 31) {
        let lastIdx = firstIdx + 1;
        if (lastIdx >= byteArray.length) {
            lastIdx = byteArray.length;
        }
        let subArray = byteArray.slice(firstIdx, lastIdx);
        let num = util.uint8ArrayToBigInt(subArray);
        if (num >= SNARK_FIELD_SIZE) {
            throw RangeError("number is out of range: " + firstIdx + " " + num);
        }
        numbers.push(num);
    }

    console.log("numbers.length: " + numbers.length);
    return numbers;
}
export { splitToArrayToCalculatePoseidonHash };
function splitToArrayToCalculatePoseidonHash(byteArray) {
    let splits = splitToNumbersWithinField(byteArray);
    const length = splits.length;
    console.log("splits length: " + length);

    if (length <= 16) {
        for (let i = 0; i < 16 - length; i++) {
            splits.push(BigInt(0));
        }
    } else {
        let length_residual = length - 16;
        let mod = length_residual % 15;
        for (let i = 0; i < 15 - mod; i++) {
            splits.push(BigInt(0));
        }
    }
    console.log("result splits length: " + splits.length);

    return splits;

}

export { encryptAndHashOfFile };
async function encryptAndHashOfFile() {
    const filename = "./test/sampledata/white10x10.bmp";
    // const filename = "./test/sampledata/white60x60_16x.bmp";
    // const filename = "./test/sampledata/white500x200_16x.bmp";
    var stat = statSync(filename);
    console.log("filesize: " + stat.size);

    const bytes = util.readFileAsUint8Array(filename);
    console.log("data length: " + typeof (bytes[0]) + " " + bytes.length);

    const keypair = genKeypair();
    console.log("privKey=" + keypair.privKey + " pubKey=" + keypair.pubKey);
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
    console.log("totalarray length: " + totalarray.length);

    const hash = await calculatePoseidonHashOfByteArray(totalarray)


    endTime = Date.now();
    console.log("convert time: " + (endTime - startTime) + " [ms]");

    console.log("hash: length=" + hash.length + " " + hash);

    const hashn = util.uint8ArrayToBigInt(hash);
    console.log("hashn: " + hashn);

    return hash;
}

export { executeDecryption };
async function executeDecryption() {
    const snarkjs = await import("snarkjs");

    const filename = "./test/sampledata/white10x10.bmp";
    // const filename = "./test/sampledata/white30x30_16x.bmp";
    const bytes = util.readFileAsUint8Array(filename);
    console.log("data: " + typeof (bytes[0]) + " " + bytes.length);// + " " + bytes);

    const keypair = genKeypair();
    const nonce = genRandomNonce();
    const encrypted = await poseidonEncrypt(bytes, keypair.pubKey, nonce);
    console.log("encrypted: " + typeof (encrypted[0]) + " " + encrypted.length);// + " " + encrypted);

    const decrypted = await poseidonDecrypt(encrypted, keypair.pubKey, nonce, bytes.length);
    console.log("decrypted: " + typeof (decrypted[0]) + " " + decrypted.length);// + " " + decrypted);

    const startTime = Date.now(); // 開始時間
    const { proof, publicSignals } = await snarkjs.groth16.fullProve({
        ciphertext: encrypted,
        nonce: nonce,
        key: keypair.pubKey,
    },
        "./work/test_poseidon/test_poseidon_js/test_poseidon.wasm",
        "./work/test_poseidon/circuit_final.zkey");
    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    fs.writeFileSync('./result/' + 'poseidon_decrypt.json', JSON.stringify(publicSignals, null, '    '));
    fs.writeFileSync('./result/' + 'poseidon_decrypt_proof.json', JSON.stringify(proof, null, '    '));
    fs.writeFile('./result/' + 'poseidon_decrypt.bmp', Buffer.from(publicSignals), (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
    const result = util.bitsToBufferArray(publicSignals);

    console.log("result: ", result);
    console.log("resultStr: ", result.toString(util.CHARSET));

}

export { executeDecryptionSimple };
async function executeDecryptionSimple() {
    const snarkjs = await import("snarkjs");

    const bytes = [0, 1, 2, 3].map((x) => BigInt(x))
    console.log("data: " + typeof (bytes[0]) + " " + bytes.length);// + " " + bytes);

    const keypair = [BigInt(123), BigInt(456)];
    const nonce = BigInt('1');
    const encrypted = await poseidonEncrypt(bytes, keypair, nonce);
    console.log("encrypted: " + typeof (encrypted[0]) + " " + encrypted.length);// + " " + encrypted);

    const decrypted = await poseidonDecrypt(encrypted, keypair, nonce, bytes.length);
    console.log("decrypted: " + typeof (decrypted[0]) + " " + decrypted.length);// + " " + decrypted);

    const startTime = Date.now(); // 開始時間
    const { proof, publicSignals } = await snarkjs.groth16.fullProve({
        ciphertext: encrypted,
        nonce: nonce,
        key: keypair,
    },
        "./work/test_poseidon/test_poseidon_js/test_poseidon.wasm",
        "./work/test_poseidon/circuit_final.zkey");
    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    fs.writeFileSync('./result/' + 'poseidon_decrypt.json', JSON.stringify(publicSignals, null, '    '));
    fs.writeFileSync('./result/' + 'poseidon_decrypt_proof.json', JSON.stringify(proof, null, '    '));

    const result = util.bitsToBufferArray(publicSignals);

    console.log("result: ", result);
    console.log("resultStr: ", result.toString(util.CHARSET));

}
