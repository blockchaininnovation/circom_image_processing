pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/mimc.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/eddsamimc.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";

include "../poseidon-encryption-circom2/circom/poseidon.circom";

include "./cid.circom";
include "./decrypt.circom";
include "./image.circom";


template DecryptionImageStamperByFilter(_encrypted_data_size) {
    var encrypted_data_size = _encrypted_data_size;
    
    signal input cid[58]; //Base32 encoded 58 characters [bytes]
    
    signal input encrypted_data[encrypted_data_size]; // [bytes]
    signal input key_for_encrypted_data[256]; //256 [bits]
    signal input nonce_for_encrypted_data[128]; // 128 [bits]

    signal input filter[encrypted_data_size];

    signal output out[encrypted_data_size];

    component cid_match = CidV1Match(encrypted_data_size);
    cid_match.in <== encrypted_data;
    cid_match.in_cid_base32 <== cid;

    component bytes2bits_encrypted_data = BytesToBits(encrypted_data_size);
    bytes2bits_encrypted_data.in <== encrypted_data;

    component decryptor = Decrypt(encrypted_data_size*8);
    decryptor.encrypted_data <== bytes2bits_encrypted_data.out;
    decryptor.key_for_encrypted_data <== key_for_encrypted_data;
    decryptor.nonce_for_encrypted_data <== nonce_for_encrypted_data;

    component bits2bytes_decrypted = BitsToBytes(encrypted_data_size * 8);
    bits2bytes_decrypted.in <== decryptor.out;

    component image = ImageProcessByWholeFilter(encrypted_data_size);
    image.in <== bits2bytes_decrypted.out;
    image.filter <== filter;

    // CIDが一致しない場合は全ゼロのデータを返す．
    for (var i = 0; i < encrypted_data_size; i++) {
        out[i] <== image.out[i] * cid_match.out;
    }
}



template DecryptionImageStamperByFilterWithPoseidon(_encrypted_data_size, _l, _size_of_splits) {
    var encrypted_data_size = _encrypted_data_size;
    var l = _l;
    var size_of_splits = _size_of_splits;
    var decrypted_data_size = l;
    while (decrypted_data_size % 3 != 0) {
        decrypted_data_size += 1;
    }
    signal input cid[58]; //Base32 encoded 58 characters [bytes]
    
    signal input encrypted_data[encrypted_data_size];
    signal input key_for_encrypted_data[2]; 
    signal input nonce_for_encrypted_data; 

    signal input encrypted_data_split_for_poseidon_hash[size_of_splits];
    signal input filter[decrypted_data_size];

    signal output out[decrypted_data_size];

    component cid_match = CidV1MatchPoseidon(size_of_splits);
    cid_match.in <== encrypted_data_split_for_poseidon_hash;
    cid_match.in_cid_base32 <== cid;
    
    component decryptor = PoseidonDecrypt(l);
    decryptor.ciphertext <== encrypted_data;
    decryptor.key <== key_for_encrypted_data;
    decryptor.nonce <== nonce_for_encrypted_data;

    component image = ImageProcessByWholeFilter(decrypted_data_size);
    image.in <== decryptor.decrypted;
    image.filter <== filter;

    // CIDが一致しない場合は全ゼロのデータを返す．
    for (var i = 0; i < decrypted_data_size; i++) {
        out[i] <== image.out[i];// * cid_match.out;
    }
}


template DecryptionImageStamperByFilterWithPoseidonMatchCheckByNumber(_encrypted_data_size, _l, _size_of_splits) {
    var encrypted_data_size = _encrypted_data_size;
    var l = _l;
    var size_of_splits = _size_of_splits;
    var decrypted_data_size = l;
    while (decrypted_data_size % 3 != 0) {
        decrypted_data_size += 1;
    }
    signal input cid_hash_number; // cid中に含まれるPoseidonハッシュの数値
    
    signal input encrypted_data[encrypted_data_size];
    signal input key_for_encrypted_data[2]; 
    signal input nonce_for_encrypted_data; 

    signal input encrypted_data_split_for_poseidon_hash[size_of_splits];
    signal input filter[decrypted_data_size];

    signal output out[decrypted_data_size];

    component cid_match = CidV1MatchPoseidonByNumber(size_of_splits);
    cid_match.in <== encrypted_data_split_for_poseidon_hash;
    cid_match.in_cid_hash_number <== cid_hash_number;
    
    component decryptor = PoseidonDecrypt(l);
    decryptor.ciphertext <== encrypted_data;
    decryptor.key <== key_for_encrypted_data;
    decryptor.nonce <== nonce_for_encrypted_data;

    component image = ImageProcessByWholeFilter(decrypted_data_size);
    image.in <== decryptor.decrypted;
    image.filter <== filter;

    // CIDが一致しない場合は全ゼロのデータを返す．
    for (var i = 0; i < decrypted_data_size; i++) {
        out[i] <== image.out[i];// * cid_match.out;
    }
}

