import fs from 'fs';
import base32 from "base32.js";
import sharp from 'sharp';

import * as util from './util.js';

const WASM_FILE = "./work/test_image/test_image_js/test_image.wasm";
const ZKEY_FILE = "./work/test_image/circuit_final.zkey";


async function execute() {
  // const file = './test/sampledata/white10x10.bmp';
  const file = './test/sampledata/white10x10_384bytes.bmp';

  const charset = await createCharMap('./test/sampledata/misaki_4x8.png');
  const snarkjs = await import("snarkjs");

  // const max_num_chars_by_byte = 100;

  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const $in = util.byteArrayToBytes(data);
    console.log("in: ", $in.length);

    const black_and_white = createCircomInput(file, charset);
    var $black_image_idx = black_and_white[0];
    var $white_image_idx = black_and_white[1];
    console.log("black_image_idx: ", $black_image_idx.length);
    console.log("white_image_idx: ", $white_image_idx.length);
    // $black_image_idx = fill($black_image_idx, max_num_chars_by_byte, -1);
    // $white_image_idx = fill($white_image_idx, max_num_chars_by_byte, -1);
    const startTime = Date.now(); // 開始時間
    // const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in, black_image_idx: $black_image_idx, white_image_idx: $white_image_idx },
    //   WASM_FILE, ZKEY_FILE);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve({ in: $in, black_image_idx: $black_image_idx, white_image_idx: $white_image_idx },
      WASM_FILE, ZKEY_FILE);

    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    fs.writeFileSync('./result/' + 'image_proof.json', JSON.stringify(proof, null, '    '));
    fs.writeFile('./result/' + 'image.bmp', Buffer.from(publicSignals), (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    });

    const hex = util.uint8ArrayToHex(publicSignals);
    const base32Str = util.bytesToBase32(publicSignals);
    console.log("hex: ", hex);
    console.log("base32Str: ", base32Str);

  });

}

async function executeWholeImage() {
  const file = './test/sampledata/white10x10.bmp';
  // const file = './test/sampledata/white10x10_384bytes.bmp';

  const charset = await createCharMap('./test/sampledata/misaki_4x8.png');
  const snarkjs = await import("snarkjs");

  fs.readFile(file, async (err, data) => {
    if (err) throw err;
    console.log("data:", data.length, " ", data);

    const $in = util.byteArrayToBytes(data);
    console.log("in: ", $in.length);

    const $filter = createCircomInputWholeBmp(file, charset);
    console.log("filter: ", $filter.length);
    const startTime = Date.now(); // 開始時間
    const { proof, publicSignals } = await snarkjs.groth16.fullProve({ in: $in, filter: $filter },
      WASM_FILE, ZKEY_FILE);

    const endTime = Date.now(); // 終了時間
    console.log("result :", publicSignals);
    console.log(endTime - startTime, " [ms]");

    fs.writeFileSync('./result/' + 'image_proof.json', JSON.stringify(proof, null, '    '));
    fs.writeFile('./result/' + 'image.bmp', Buffer.from(publicSignals), (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    });

  });

}

class Bitmap3x6 {
  constructor() {
    // 各ピクセルはRGBで3バイト、合計3x6ピクセルなので54バイト必要
    this.data = Buffer.alloc(3 * 3 * 6);
  }

  // ピクセルの色を設定するメソッド
  setPixel(x, y, r, g, b) {
    if (x < 0 || x >= 3 || y < 0 || y >= 6) {
      throw new Error('座標がビットマップの範囲外です。');
    }

    const index = (y * 3 + x) * 3;
    this.data[index] = r;
    this.data[index + 1] = g;
    this.data[index + 2] = b;
  }

  // ピクセルの色を取得するメソッド
  getPixel(x, y) {
    if (x < 0 || x >= 3 || y < 0 || y >= 6) {
      throw new Error('座標がビットマップの範囲外です。x=' + x + ' y=' + y);
    }

    const index = (y * 3 + x) * 3;
    return {
      r: this.data[index],
      g: this.data[index + 1],
      b: this.data[index + 2]
    };
  }

  reverseColor() {
    for (let i = 0; i < 3 * 3 * 6; i++) {
      if (this.data[i] == 255) {
        this.data[i] = 0;
      } else {
        this.data[i] = 255;
      }
    }
  }

  toString() {
    let str = 'Bitmap3x6:\n';
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 3; x++) {
        const { r, g, b } = this.getPixel(x, y);
        str += `(${r}, ${g}, ${b}) `;
      }
      str += '\n';
    }
    return str;
  }
}

async function getPixelColor(filePath, x, y) {
  try {
    // 画像を読み込み、生のピクセルデータに変換
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // 指定された座標が画像の範囲内にあるか確認
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new Error('指定された座標は画像の範囲外です。x=' + x + ' y=' + y);
    }

    // 画像から指定されたピクセルのRGBデータを抽出
    const buffer = await image.extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer();
    return {
      r: buffer[0],
      g: buffer[1],
      b: buffer[2]
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function extractFontArray(file) {
  const all = [[]];
  for (let row = 0; row < 6; row++) {
    const row_set = [];
    all[row] = row_set;

    var y_topleft = 24 + row * 6; //0の左上はy=24から開始．高さ5
    y_topleft += row * 2; // 行間は2
    // 0の行から1行ずつpの行までの5行読み込む
    for (let col = 0; col < 16; col++) {
      let x_topleft = col * 3;
      x_topleft += col * 1; // 列間は1

      const moji = new Bitmap3x6();
      row_set[col] = moji;
      for (let y = y_topleft; y < y_topleft + 6; y++) {
        for (let x = x_topleft; x < x_topleft + 3; x++) {
          const rgb = await getPixelColor(file, x, y);
          // console.log('x=', x, ' y=', y, ' rgb=', rgb);
          moji.setPixel(x - x_topleft, y - y_topleft, rgb['r'], rgb['g'], rgb['b']);
        }
      }
    }
  }
  return all;
}

function blackWhiteReverse(all) {
  for (let key_row in all) {
    // console.log("row: " + key_row + " " + all[key_row]);
    var row = all[key_row];
    for (let key in row) {
      var moji = row[key];
      // console.log(key, " ", moji);
      moji.reverseColor();
    }
  }
}

function getOneCharByIdx(x, y, all) {
  const char = all[y][x];

  const ret = [];
  const row0 = [[]];
  const row1 = [[]];
  const row2 = [[]];
  const row3 = [[]];
  const row4 = [[]];
  const row5 = [[]];
  ret.push(row0);
  ret.push(row1);
  ret.push(row2);
  ret.push(row3);
  ret.push(row4);
  ret.push(row5);

  for (let i = 0; i < 3; i++) {
    var rgb = char.getPixel(i, 5);
    row0[i] = [rgb['r'], rgb['g'], rgb['b']];
    rgb = char.getPixel(i, 4);
    row1[i] = [rgb['r'], rgb['g'], rgb['b']];
    rgb = char.getPixel(i, 3);
    row2[i] = [rgb['r'], rgb['g'], rgb['b']];
    rgb = char.getPixel(i, 2);
    row3[i] = [rgb['r'], rgb['g'], rgb['b']];
    rgb = char.getPixel(i, 1);
    row4[i] = [rgb['r'], rgb['g'], rgb['b']];
    rgb = char.getPixel(i, 0);
    row5[i] = [rgb['r'], rgb['g'], rgb['b']];
  }

  return ret;
}

export { createCharMap };
async function createCharMap(file) {
  try {
    // 1つ目はマップ．インデックスは文字列．数字と小文字大文字のアルファベットのみ．0123...abcd...ABCD...
    // 2つ目のインデックスは，下から上へ4行分(Bitmapの仕様上下から上にデータが保管されているのでそれに合わせている)
    // 3つ目：左から3ピクセル分
    // 4つ目：RGB3色
    var all = await extractFontArray(file);
    blackWhiteReverse(all);
    // console.log(all);

    const ret = {};
    // 0 to 9
    ret["0"] = getOneCharByIdx(0, 0, all);
    ret["1"] = getOneCharByIdx(1, 0, all);
    ret["2"] = getOneCharByIdx(2, 0, all);
    ret["3"] = getOneCharByIdx(3, 0, all);
    ret["4"] = getOneCharByIdx(4, 0, all);
    ret["5"] = getOneCharByIdx(5, 0, all);
    ret["6"] = getOneCharByIdx(6, 0, all);
    ret["7"] = getOneCharByIdx(7, 0, all);
    ret["8"] = getOneCharByIdx(8, 0, all);
    ret["9"] = getOneCharByIdx(9, 0, all);

    // A to O
    ret["A"] = getOneCharByIdx(1, 1, all);
    ret["B"] = getOneCharByIdx(2, 1, all);
    ret["C"] = getOneCharByIdx(3, 1, all);
    ret["D"] = getOneCharByIdx(4, 1, all);
    ret["E"] = getOneCharByIdx(5, 1, all);
    ret["F"] = getOneCharByIdx(6, 1, all);
    ret["G"] = getOneCharByIdx(7, 1, all);
    ret["H"] = getOneCharByIdx(8, 1, all);
    ret["I"] = getOneCharByIdx(9, 1, all);
    ret["J"] = getOneCharByIdx(10, 1, all);
    ret["K"] = getOneCharByIdx(11, 1, all);
    ret["L"] = getOneCharByIdx(12, 1, all);
    ret["M"] = getOneCharByIdx(13, 1, all);
    ret["N"] = getOneCharByIdx(14, 1, all);
    ret["O"] = getOneCharByIdx(15, 1, all);

    // P to Z
    ret["P"] = getOneCharByIdx(0, 2, all);
    ret["Q"] = getOneCharByIdx(1, 2, all);
    ret["R"] = getOneCharByIdx(2, 2, all);
    ret["S"] = getOneCharByIdx(3, 2, all);
    ret["T"] = getOneCharByIdx(4, 2, all);
    ret["U"] = getOneCharByIdx(5, 2, all);
    ret["V"] = getOneCharByIdx(6, 2, all);
    ret["W"] = getOneCharByIdx(7, 2, all);
    ret["X"] = getOneCharByIdx(8, 2, all);
    ret["Y"] = getOneCharByIdx(9, 2, all);
    ret["Z"] = getOneCharByIdx(10, 2, all);

    // a to o
    ret["a"] = getOneCharByIdx(1, 3, all);
    ret["b"] = getOneCharByIdx(2, 3, all);
    ret["c"] = getOneCharByIdx(3, 3, all);
    ret["d"] = getOneCharByIdx(4, 3, all);
    ret["e"] = getOneCharByIdx(5, 3, all);
    ret["f"] = getOneCharByIdx(6, 3, all);
    ret["g"] = getOneCharByIdx(7, 3, all);
    ret["h"] = getOneCharByIdx(8, 3, all);
    ret["i"] = getOneCharByIdx(9, 3, all);
    ret["j"] = getOneCharByIdx(10, 3, all);
    ret["k"] = getOneCharByIdx(11, 3, all);
    ret["l"] = getOneCharByIdx(12, 3, all);
    ret["m"] = getOneCharByIdx(13, 3, all);
    ret["n"] = getOneCharByIdx(14, 3, all);
    ret["o"] = getOneCharByIdx(15, 3, all);

    // p to z
    ret["p"] = getOneCharByIdx(0, 4, all);
    ret["q"] = getOneCharByIdx(1, 4, all);
    ret["r"] = getOneCharByIdx(2, 4, all);
    ret["s"] = getOneCharByIdx(3, 4, all);
    ret["t"] = getOneCharByIdx(4, 4, all);
    ret["u"] = getOneCharByIdx(5, 4, all);
    ret["v"] = getOneCharByIdx(6, 4, all);
    ret["w"] = getOneCharByIdx(7, 4, all);
    ret["x"] = getOneCharByIdx(8, 4, all);
    ret["y"] = getOneCharByIdx(9, 4, all);
    ret["z"] = getOneCharByIdx(10, 4, all);

    // for (let key in ret) {
    //   printOne(ret, key);
    // }

    return ret;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function printOne(charset, key) {
  console.log("char: " + key);
  for (let y = 0; y < 6; y++) {
    let line = "";
    for (let x = 0; x < 3; x++) {
      const rgb = charset[key][y][x];
      rgb.forEach(e => {
        line += util.toHex(e) + ",";
      });
      line += " ";
    }
    console.log(line);
  }
}

export { createCircomInput };
/**
 * 文字埋め込み対象のビットマップをバイト列として読み込む．
 * 黒塗りするバイト位置，白塗りするバイト位置をListとして返す．
 * @param {*} file 
 * @param {*} charset 
 * @returns 
 */
function createCircomInput(file, charset) {
  var bytes = util.readFileAsUint8Array(file);
  // for (let i = 0; i < bytes.length; i += 10) {
  //   const chunk = bytes.slice(i, i + 10);
  //   console.log(uint8ArrayToHex(chunk));
  // }

  // 縦横幅を取得
  const width = 65536 * bytes[15] + 4096 * bytes[16] + 256 * bytes[17] + bytes[18];
  const height = 65536 * bytes[19] + 4096 * bytes[20] + 256 * bytes[21] + bytes[22];

  // console.log("width: " + width + " :: " + bytes[15] + " " + bytes[16] + " " + bytes[17] + " " + bytes[18]);
  // console.log("height: " + height + " :: " + bytes[19] + " " + bytes[20] + " " + bytes[21] + " " + bytes[22]);

  // 1行のバイト長．1行が4の倍数でないときは0埋めされて4の倍数になる．
  // Finding the largest multiple of 4 that is less than or equal to n
  const width_bytes_length = (width * 3) + (4 - (width * 3) % 4) % 4;
  // console.log("width_bytes_length: " + width_bytes_length);

  // 下から9行分の先頭インデックスを計算
  // 0番目が一番下
  const char_rows_head_index = [];
  for (var i = 0; i < 9; i++) {
    char_rows_head_index.push(53 + 1 + i * width_bytes_length);
  }
  // console.log("char_rows_head_index: " + char_rows_head_index);

  // printOne(charset, "A");

  var black_image_idx = [];
  var white_image_idx = [];

  var header_last = 53;
  for (var idx = header_last + 1; idx < bytes.length; idx++) {
    var row = -1;
    // 下から何行目か計算
    for (let i = 0; i < 8; i++) {
      if (char_rows_head_index[i] <= idx && idx <= char_rows_head_index[i + 1] - 1) {
        row = i;
        break;
      }
    }
    // console.log("idx: " + idx + " row: " + row);
    if (row >= 0) {
      // 何列目か計算
      var col = idx - char_rows_head_index[row];
      var rgb = col % 3; // 0: R, 1: G, 2: B
      var col_px = (col - rgb) / 3;

      // console.log("idx: " + idx + " row: " + row + " col: " + col + " rgb: " + rgb + " col_px: " + col_px);
      //とりあえず1文字だけ入れてみる
      if (col_px <= 4) {
        // 一番下の行と8行目は真っ黒にする．
        if (row == 0 || row == 7) {
          black_image_idx.push(idx);
        } else {
          if (col_px == 0 || col_px == 4) {
            black_image_idx.push(idx);

          } else {
            // ここから文字書き出し．
            var charpx = charset["A"];

            // console.log("charpx: " + charpx);
            var charrow = charpx[row - 1];
            // console.log("charrow: " + charrow);
            var charcol = charrow[col_px - 1];
            // console.log("charcol: " + charcol);
            var char_color = charcol[rgb];
            // console.log("char_color: " + char_color);
            if (char_color == 0) {
              black_image_idx.push(idx);
            } else {
              white_image_idx.push(idx);
            }
          }
        }
      }
    } else {
      // 1から7行目じゃないところは何もしない．
    }

  }

  // 3バイトずつ空白を開けてログ出力．
  var black_log = "";
  for (let i = 0; i < black_image_idx.length; i++) {
    const idx = black_image_idx[i];
    if (i % 3 == 0) {
      black_log += " ";
    }
    black_log += idx + ",";
  }
  var white_log = "";
  for (let i = 0; i < white_image_idx.length; i++) {
    const idx = white_image_idx[i];
    if (i % 3 == 0) {
      white_log += " ";
    }
    white_log += idx + ",";
  }

  console.log("result:: black_image_idx: " + black_log);
  console.log("result:: white_image_idx: " + white_log);
  return [black_image_idx, white_image_idx];
}


export { createCircomInputWholeBmp };
/**
 * 文字埋め込み対象のビットマップをバイト列として読み込む．
 * 黒塗りするバイト位置，白塗りするバイト位置をListとして返す．
 * @param {*} file 
 * @param {*} charset 
 * @returns 
 */
function createCircomInputWholeBmp(file, charset) {
  const black_and_white = createCircomInput(file, charset);
  const black_image_idx = black_and_white[0];
  const white_image_idx = black_and_white[1];

  var ret = [];
  var bytes = util.readFileAsUint8Array(file);
  for (let i = 0; i < bytes.length; i++) {
    if (black_image_idx.includes(i)) {
      ret[i] = 0;
    } else if (white_image_idx.includes(i)) {
      ret[i] = 255;
    } else {
      ret[i] = 300;
    }
  }

  return ret;
}

async function testReplaceBMP() {
  const file = './test/sampledata/white10x10.bmp';

  const charset = await createCharMap('./sampledata/misaki_4x8.png');
  console.log("charset: " + Object.keys(charset));

  const $in = util.readFileAsUint8Array(file);
  console.log("in: ", $in.length);

  const black_and_white = createCircomInput(file, charset);
  var $black_image_idx = black_and_white[0];
  var $white_image_idx = black_and_white[1];
  console.log("black_image_idx: ", $black_image_idx.length);
  console.log("white_image_idx: ", $white_image_idx.length);

  var size = $in.length;

  var out = [];
  var header_last = 53;
  // ヘッダ領域は丸コピー
  for (var i = 0; i <= header_last; i++) {
    out.push($in[i]);
  }

  // 指定した場所を黒または白に
  for (var i = header_last + 1; i < size; i++) {
    var isBlack = $black_image_idx.includes(i);
    var isWhite = $white_image_idx.includes(i);

    var notBlackAndNotWhite = (1 - isBlack) * (1 - isWhite);
    out.push(isWhite * 255 + isBlack * 0 + notBlackAndNotWhite * $in[i]);
  }

  console.log("out: " + out.length + " $in: " + $in.length);
  const buffer = Buffer.from(new Uint8Array(out));
  fs.writeFileSync('./result/' + "out.bmp", buffer);
}
