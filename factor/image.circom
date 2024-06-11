pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsamimc.circom";


template ImageProcessByWholeFilter(_size) {
    var size = _size;

    signal input in[size];
    signal input filter[size];

    signal output out[size]; 

    var header_last = 53;
    // ヘッダ領域は丸コピー
    for(var i = 0; i <= header_last; i++){
        out[i] <== in[i];
    }

    component isPaint[size];
    signal out1[size];
    for(var i = header_last + 1; i < size; i++){
        isPaint[i] = IsEqual();
        isPaint[i].in[0] <== 300;
        isPaint[i].in[1] <== filter[i];

        out1[i] <== isPaint[i].out * in[i];
        out[i] <== out1[i] + (1 - isPaint[i].out) * filter[i];
    }

    
}
