pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsamimc.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";
include "../circom-chacha20/circuits/aes/aes_ctr.circom";

template Decrypt(_encrypted_data_size_by_bit) {
    var encrypted_data_size_by_bit = _encrypted_data_size_by_bit;
   
   signal input encrypted_data[encrypted_data_size_by_bit];   // bits
   signal input key_for_encrypted_data[256]; //256 bits
   signal input nonce_for_encrypted_data[128]; // 128 bits
   signal output out[encrypted_data_size_by_bit];

    // decryption by common_key
    component decryptor = AES_CTR(encrypted_data_size_by_bit);
    for (var i = 0; i < encrypted_data_size_by_bit; i++) {
        decryptor.MSG[i] <== encrypted_data[i];
    }

    for (var i = 0; i < 256; i++) {
        decryptor.K1[i] <== key_for_encrypted_data[i];
    }
    for (var i = 0; i < 128; i++) {
        decryptor.CTR[i] <== nonce_for_encrypted_data[i];
    }
    
    for (var i = 0; i < encrypted_data_size_by_bit; i++) {
        out[i] <== decryptor.CT[i];
    }
}

