const snarkjs = require("snarkjs");
const fs = require('fs');

async function execute() {
    const $in = "121212121515";

    const { proof, publicSignals } = await snarkjs.plonk.fullProve({ in: $in },
        "./work/circuit_hash/circuit_hash_js/circuit_hash.wasm",
        "./work/circuit_hash/circuit_final.zkey");

    console.log("msg hash:", publicSignals);

    fs.writeFileSync('./result/' + 'hash.json', JSON.stringify(publicSignals, null, '    '));
    fs.writeFileSync('./result/' + 'hash_proof.json', JSON.stringify(proof, null, '    '));

}
