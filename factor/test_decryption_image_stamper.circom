pragma circom 2.0.0;

include "./decryption_image_stamper.circom";


component main {public [cid, filter]} = DecryptionImageStamperByFilter(VAR);
