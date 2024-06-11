pragma circom 2.0.0;

include "./cid.circom";

// component main = CidV1WithoutBase32(32);
component main = CidV1WithoutBase32Poseidon(31);
// component main = CidV1WithoutBase32PoseidonNumber(16);