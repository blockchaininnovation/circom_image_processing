pragma circom 2.0.0;

include "./decryption_image_stamper.circom";

component main {public [cid_hash_number, filter, encrypted_data, encrypted_data_split_for_poseidon_hash]}= DecryptionImageStamperByFilterWithPoseidonMatchCheckByNumber(VARE, VARL, VARS);
