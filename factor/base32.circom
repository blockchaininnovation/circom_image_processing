pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/comparators.circom";

// https://github.com/zkemail/zk-email-verify/blob/5c86156501c575086e1a06715297fe85b885ebf5/packages/circuits/helpers/base68.circom
// を改変
// MIT License https://github.com/zkemail/zk-email-verify/blob/5c86156501c575086e1a06715297fe85b885ebf5/LICENSE
template Base32Lookup() {
    signal input in;
    signal output out;

    // ['A', 'Z'] 65 to 90
    component le_Z = LessThan(8);
    le_Z.in[0] <== in;
    le_Z.in[1] <== 90+1;

    component ge_A = GreaterThan(8);
    ge_A.in[0] <== in;
    ge_A.in[1] <== 65-1;

    signal range_AZ <== ge_A.out * le_Z.out;
    signal sum_AZ <== range_AZ * (in - 65); // 00000 to 11001 (0 to 25)

    // ['a', 'z'] 97 to 122
    component le_z = LessThan(8);
    le_z.in[0] <== in;
    le_z.in[1] <== 122+1;

    component ge_a = GreaterThan(8);
    ge_a.in[0] <== in;
    ge_a.in[1] <== 97-1;

    signal range_az <== ge_a.out * le_z.out;
    signal sum_az <== sum_AZ + range_az * (in - 97); // 00000 to 11001 (0 to 25)

    // ['2', '7']  50 to 55
    component le_7 = LessThan(8);
    le_7.in[0] <== in;
    le_7.in[1] <== 55+1;

    component ge_2 = GreaterThan(8);
    ge_2.in[0] <== in;
    ge_2.in[1] <== 50-1;

    signal range_27 <== ge_2.out * le_7.out;
    signal sum_27 <== sum_az + range_27 * (in - 50 + 26); // 11010 to bbbbb (26 to 51)

    out <== sum_27;

    // '=' 61
    component equal_eqsign = IsZero();
    equal_eqsign.in <== in - 61;

    1 === range_AZ + range_az + range_27 + equal_eqsign.out;
}

// < 2^14
template Base32Decode(N) {
    var M = 8*((N+4)\5);

    signal input in[M];
    signal output out[N];

    component bits_in[M\8][8];
    component bits_out[M\8][5];
    component translate[M\8][8];

    // 5bitずつの列8個を8bit (1byte)ずつの列5個に変換．
    // bbbbb bbbbb bbbbb bbbbb bbbbb bbbbb bbbbb bbbbb
    // 34567   012
    //       67    12345     0
    //                   4567   0123
    //                         7     23456    01
    //                                     567   01234
    var idx = 0;
    for (var i = 0; i < M; i += 8) {
        for (var j = 0; j < 5; j++) {
            bits_out[i\8][j] = Bits2Num(8);
        }

        for (var j = 0; j < 8; j++) {
            bits_in[i\8][j] = Num2Bits(5);
            translate[i\8][j] = Base32Lookup();
            translate[i\8][j].in <== in[i+j];
            translate[i\8][j].out ==> bits_in[i\8][j].in;
        }

        // Do the re-packing from eight 5-bit words to five 8-bit words.

        // 0th byte
        for (var j = 0; j <= 4; j++) {
            bits_out[i\8][0].in[j+3] <== bits_in[i\8][0].out[j];
        }
        for (var j = 2; j <= 4; j++) {
            bits_out[i\8][0].in[j-2] <== bits_in[i\8][1].out[j];
        }

        // 1st byte
        for (var j = 0; j <= 1; j++) {
            bits_out[i\8][1].in[j+6] <== bits_in[i\8][1].out[j];
        }
        for (var j = 0; j <= 4; j++) {
            bits_out[i\8][1].in[j+1] <== bits_in[i\8][2].out[j];
        }
        bits_out[i\8][1].in[0] <== bits_in[i\8][3].out[4];

        // 2nd byte
        for (var j = 0; j <= 3; j++) {
            bits_out[i\8][2].in[j+4] <== bits_in[i\8][3].out[j];
        }        
        for (var j = 1; j <= 4; j++) {
            bits_out[i\8][2].in[j-1] <== bits_in[i\8][4].out[j];
        }

        // 3rd byte
        bits_out[i\8][3].in[7] <== bits_in[i\8][4].out[0];
        for (var j = 0; j <= 4; j++) {
            bits_out[i\8][3].in[j+2] <== bits_in[i\8][5].out[j];
        }  
        for (var j = 3; j <= 4; j++) {
            bits_out[i\8][3].in[j-3] <== bits_in[i\8][6].out[j];
        }

        // 4th byte
        for (var j = 0; j <= 2; j++) {
            bits_out[i\8][4].in[j+5] <== bits_in[i\8][6].out[j];
        }  
        for (var j = 0; j <= 4; j++) {
            bits_out[i\8][4].in[j] <== bits_in[i\8][7].out[j];
        }  



        for (var j = 0; j < 5; j++) {
            if (idx+j < N) {
                out[idx+j] <== bits_out[i\8][j].out;
            }
        }
        idx += 5;
    }
}



template Base32DecodeCid() {
    var N = 36;
    var M = 64;
    // var M = 8*((N+4)\5);
    signal input in[M-6];
    signal output out[N];

    signal _in[M];

    for (var i = 0; i < M-6; i++) {
        _in[i] <== in[i];
    }
    for (var i = M-6; i < M; i++) {
        _in[i] <== 61; // = で補完
    }

    component decode = Base32Decode(N);
    decode.in <== _in;
    out <== decode.out;

}