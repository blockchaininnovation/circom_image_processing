import fs from 'fs';
import crypto from "crypto";
import base32 from "base32.js";


export { stringToByteArray, uint8ArrayToHex, base32ToBytes, byteArrayToBits, byteArrayToBytes, paddingZero, bitsToBufferArray, bitsToNum, hexStringToUint8Array, bytesToBase32, bufferToUint8Array, fill, toHex, readFileAsUint8Array, bigIntToUint8Array, arrayToHexString, extractFileName, uint8ArrayToBigInt };

export { CHARSET };
const CHARSET = "utf8";

function stringToByteArray(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
}

function uint8ArrayToHex(uint8Array) {
    return Buffer.from(uint8Array).toString("hex");
}

function uint8ArrayToBigInt(uint8Array) {
    let ret = BigInt(0);
    for (let i = 0; i < uint8Array.length; i++) {
        ret = ret + BigInt(256 ** i) * BigInt(uint8Array[i]);
    }
    return ret;
}

function arrayToHexString(arr) {
    let hexString = '';
    for (let i = 0; i < arr.length; i++) {
        hexString += arr[i].toString(16).padStart(2, '0');
    }
    return hexString;
}

function base32ToBytes(base32String) {
    const decoder = new base32.Decoder();
    const bytes = decoder.write(base32String).finalize();
    return bytes;
}

function byteArrayToBits(buff) {
    const res = [];
    for (let i = 0; i < buff.length; i++) {
        for (let j = 0; j < 8; j++) {
            if ((buff[i] >> 7 - j) & 1) {
                res.push(1);
            } else {
                res.push(0);
            }
        }
    }
    return res;
}

function byteArrayToBytes(buff) {
    const res = [];
    for (let i = 0; i < buff.length; i++) {
        res.push(buff[i]);
    }
    return res;
}

function paddingZero(l, n) {
    if (l.length < n) {
        const diff = n - l.length;
        for (let i = 0; i < diff; i++) {
            l.push(0);
        }
    }
    return l
}

function bitsToBufferArray(bits) {
    const arr = new Uint8Array(bits.length / 8);
    for (let i = 0; i < bits.length; i += 8) {
        const uint = bitsToNum(bits.slice(i, i + 8));
        arr[i / 8] = uint;
    }

    return Buffer.from(arr);
}

function bitsToNum(bits) {
    return bits.reduce((num, bit, index) => num + (bit << (7 - index)), 0);
}

function hexStringToUint8Array(hexString) {
    if (hexString.length % 2 !== 0) {
        throw new Error("invalid hex");
    }

    const bytes = new Uint8Array(hexString.length / 2);

    for (let i = 0, j = 0; i < hexString.length; i += 2, j++) {
        bytes[j] = parseInt(hexString.substr(i, 2), 16);
    }

    return bytes;
}


function bytesToBase32(bytes) {
    const encoder = new base32.Encoder();
    return encoder.write(bytes).finalize()
}

function bufferToUint8Array(buffer) {
    return new Uint8Array(buffer);
}

function fill(l, n, fillnumber) {
    if (l.length < n) {
        const diff = n - l.length;
        for (let i = 0; i < diff; i++) {
            l.push(fillnumber);
        }
    }
    return l
}

function toHex(num) {
    var s = num.toString(16);
    var dLen = s.toString(16).length;
    s = Array("00".length - dLen + 1).join('0') + s;
    return s;
}


function readFileAsUint8Array(filePath) {
    const fileData = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(fileData);
    return uint8Array;
}


function bigIntToUint8Array(bigint) {
    const bytes = [];
    while (bigint > 0) {
        const byte = Number(bigint % BigInt(256));
        bytes.push(byte);
        bigint = (bigint - BigInt(byte)) / BigInt(256); 
    }
    while (bytes.length < 32) {
        bytes.push(0); // 長さが32未満の場合、0で埋める
    }
    // return new Uint8Array(bytes.reverse());
    return new Uint8Array(bytes);
}

function extractFileName(path) {
    // 最後の'/'または'\'の位置を見つける
    const lastSlash = path.lastIndexOf('/');
    const lastBackSlash = path.lastIndexOf('\\');

    // 両方のスラッシュが存在する場合は、最後のものを使用
    const lastIndex = Math.max(lastSlash, lastBackSlash);

    // スラッシュの後の部分をファイル名として返す
    return path.substring(lastIndex + 1);
}