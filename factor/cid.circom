pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsamimc.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

include "./base32.circom";


template CidV1Match(_size) {
    var size = _size;
    signal input in[size]; // input data [bytes]
    signal input in_cid_base32[58]; //Base32 encoded 58 characters [bytes]
    
    signal output out;


    // 入力されたデータからCIDを計算，数字に変換する．
    component cid_calc = CidV1WithoutBase32(size);
    cid_calc.in <== in;
    component bytes_to_bits_cid_calc = BytesToBits(36);
    bytes_to_bits_cid_calc.in <== cid_calc.out;
    component b2n_cid_calc = Bits2Num(36 * 8);
    b2n_cid_calc.in <==  bytes_to_bits_cid_calc.out;

    // 入力されたBase32のCIDをデコード後，数字に変換
    component base32_decorder = Base32DecodeCid();
    base32_decorder.in <== in_cid_base32;
    component bytes_to_bits_in_cid = BytesToBits(36);
    bytes_to_bits_in_cid.in <== base32_decorder.out;
    component b2n_in_cid = Bits2Num(36 * 8);
    b2n_in_cid.in <== bytes_to_bits_in_cid.out;

    // 2つが一致しているか比較
    component eq = IsEqual();
    eq.in[0] <== b2n_cid_calc.out;
    eq.in[1] <== b2n_in_cid.out;
    
    out <== eq.out;
}

template CidV1WithoutBase32ByBits(_size) {
    var size = _size;

    signal input in[size]; // input data by bits
    signal output out[36 * 8]; //36 * 8 bits

    // cid_version: 1
    out[0] <== 0; 
    out[1] <== 0; 
    out[2] <== 0; 
    out[3] <== 0; 
    out[4] <== 0; 
    out[5] <== 0; 
    out[6] <== 0; 
    out[7] <== 1;

    // raw 0x55: 85
    out[8] <== 0; 
    out[9] <== 1; 
    out[10] <== 0; 
    out[11] <== 1; 
    out[12] <== 0; 
    out[13] <== 1; 
    out[14] <== 0; 
    out[15] <== 1; 
    
    // SHA-256 0x12: 18
    out[16] <== 0; 
    out[17] <== 0; 
    out[18] <== 0; 
    out[19] <== 1; 
    out[20] <== 0; 
    out[21] <== 0; 
    out[22] <== 1; 
    out[23] <== 0; 

    // length: 32
    out[24] <== 0; 
    out[25] <== 0; 
    out[26] <== 1; 
    out[27] <== 0; 
    out[28] <== 0; 
    out[29] <== 0; 
    out[30] <== 0; 
    out[31] <== 0; 

    
    component sha = Sha256(size);
    sha.in <== in;

    for (var i = 0; i < 256; i++) {
        out[i+32] <== sha.out[i]; 
    }
}

//  Plonk constraints < 2**18
template CidV1WithoutBase32(_size) {
    var size = _size;

    signal input in[size];
    signal output out[36]; //36 Bytes

    out[0] <== 1; // cid_version
    out[1] <== 85; // raw 0x55
    out[2] <== 18; // SHA-256 0x12
    out[3] <== 32; // length

    component bytesToBits = BytesToBits(size);
    bytesToBits.in <== in;
    
    component sha = Sha256(size * 8);
    sha.in <== bytesToBits.out;

    component bitsToBytes = BitsToBytes(256);
    bitsToBytes.in <== sha.out;
    
    for (var i = 0; i < 32; i++) {
        out[i+4] <== bitsToBytes.out[i]; 
    }
}

template BitsToBytes(_size) {
    var size = _size;

    signal input in[size];
    signal output out[size\8];

    component bits_to_bytes[size\8];
    for (var i = 0; i < size\8; i++) {
        bits_to_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            bits_to_bytes[i].in[j] <== in[i*8 + 7 - j];
        }
        out[i] <== bits_to_bytes[i].out;
    } 
}

template BytesToBits(_size) {
    var size = _size;
    signal input in[size];
    signal output out[size*8];

    component bytes_to_bits[size];
    for (var i = 0; i < size; i++) {
        bytes_to_bits[i] = Num2Bits(8);
        bytes_to_bits[i].in <== in[i];
        for (var j = 0; j < 8; j++) {
            out[i*8 + 7 - j] <== bytes_to_bits[i].out[j];
        }
    }
}


template Num2Bytes(_size) {
    var size = _size;
    signal input in;
    signal output out[size];

    var num = in;
    signal tmp[size];
    // for (var i = size -1; i >= 0; i--) {
    for (var i = 0; i < size; i++) {
        tmp[i] <-- num % 256;
        out[i] <== tmp[i];
        num = (num - tmp[i]) / 256;
    }
}

template Bytes2Num(_size) {
    var size = _size;

    signal input in[size];
    signal output out;

    component bytes2bits = BytesToBits(size);
    bytes2bits.in <== in;

    component bits2num = Bits2Num(size * 8);
    bits2num.in <== bytes2bits.out;
    out <== bits2num.out;
}

template SplitBytes(n, m) {
    // var outlength = n/16 + (n % 16 != 0 ? 1 : 0);
    signal input in[n];
    signal output out[16][m];  // n/16 は切り捨て、余りがあれば1つ追加

    for (var i = 0; i < 16; i++) {
        for (var j = 0; j < m; j++) {
            var idx = 16 * j + i;
            if (idx < n) {
                out[i][j] <== in[idx];
            } else {
                out[i][j] <== 0;  // バイト列が16で割り切れない場合に0で埋める
            }
        }
    }
}


template CidV1WithoutBase32Poseidon(_input_size) {
    var input_size = _input_size;

    signal input in[input_size]; // PoseidonHash計算のために分割されたデータ
    signal output out[36]; //36 Bytes

    out[0] <== 1; // cid_version
    out[1] <== 85; // raw 0x55
    out[2] <== 18; // TODO とりあえずSHA256と同じ0x12
    out[3] <== 32; // length, poseidon hashは32bytes


    component poseidonNumber = CidV1WithoutBase32PoseidonNumber(input_size);
    poseidonNumber.in <== in;

    component num2Bytes = Num2Bytes(32);
    num2Bytes.in <== poseidonNumber.out;
    for (var i = 0; i < 32; i++) {
        out[i+4] <== num2Bytes.out[i]; 
    }
}


template CidV1WithoutBase32PoseidonNumber(_input_size) {
    var input_size = _input_size;

    assert((input_size - 16)%15 == 0);

    signal input in[input_size]; // PoseidonHash計算のために分割されたデータ
    signal output out;

    var size_of_15_chunks = (input_size - 16)\15;

    // 最初のチャンクの割り当て
    component poseidons[1 + size_of_15_chunks];
    
    poseidons[0] = Poseidon(16);
    for (var i = 0; i < 16; i++) {
        poseidons[0].inputs[i] <== in[i];
    }

    for (var chunkIndex = 0; chunkIndex < size_of_15_chunks; chunkIndex++) {
        poseidons[chunkIndex + 1] = Poseidon(16);
        for (var j = 0; j < 15; j++) {
            var index = 16 + chunkIndex * 15 + j; // 最初の16要素をスキップ
            poseidons[chunkIndex+1].inputs[j] <== in[index];
        }
        // 最後の要素は前のPoseidonの出力を使う
        poseidons[chunkIndex+1].inputs[15] <== poseidons[chunkIndex].out;
    }

    out <== poseidons[size_of_15_chunks].out;
}


template CidV1MatchPoseidon(_input_size) {
    var input_size = _input_size;
    signal input in[input_size]; // PoseidonHash計算のために分割されたデータ
    signal input in_cid_base32[58]; //Base32 encoded 58 characters [bytes]
    
    signal output out;

    // 入力されたデータからCIDを計算，数字に変換する．
    component cid_calc = CidV1WithoutBase32Poseidon(input_size);
    cid_calc.in <== in;
    component bytes_to_bits_cid_calc = BytesToBits(36);
    bytes_to_bits_cid_calc.in <== cid_calc.out;
    component b2n_cid_calc = Bits2Num(36 * 8);
    b2n_cid_calc.in <==  bytes_to_bits_cid_calc.out;

    // 入力されたBase32のCIDをデコード後，数字に変換
    component base32_decorder = Base32DecodeCid();
    base32_decorder.in <== in_cid_base32;
    component bytes_to_bits_in_cid = BytesToBits(36);
    bytes_to_bits_in_cid.in <== base32_decorder.out;
    component b2n_in_cid = Bits2Num(36 * 8);
    b2n_in_cid.in <== bytes_to_bits_in_cid.out;

    // 2つが一致しているか比較
    component eq = IsEqual();
    eq.in[0] <== b2n_cid_calc.out;
    eq.in[1] <== b2n_in_cid.out;
    
    out <== eq.out;
}

template CidV1MatchPoseidonByNumber(_input_size) {
    var input_size = _input_size;
    signal input in[input_size]; // PoseidonHash計算のために分割されたデータ
    signal input in_cid_hash_number; // ハッシュ値の数値
    
    signal output out;

    // 入力されたデータからCIDを計算，数字に変換する．
    component cid_calc = CidV1WithoutBase32PoseidonNumber(input_size);
    cid_calc.in <== in;

    // 2つが一致しているか比較
    component eq = IsEqual();
    eq.in[0] <== in_cid_hash_number;
    eq.in[1] <== cid_calc.out;
    
    out <== eq.out;
}
