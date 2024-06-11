#!/bin/bash

WORKDIR=work/$1

echo "start: `date '+%y/%m/%d %H:%M:%S'`"

#witnessを生成．
#回路と，そのインプットをもとにウィットネスを生成する．
echo "14. Calculate the witness"
node $WORKDIR/$1_js/generate_witness.js $WORKDIR/$1_js/$1.wasm factor/$2.json $WORKDIR/witness.wtns

#証明を生成．
#回路，ウィットネスと証明鍵をもとに証明（proof.json）と公開値（public.json)を生成．
#公開値は，この場合はcの値．
echo "23. Create the proof"
# npx snarkjs groth16 prove $WORKDIR/circuit_final.zkey $WORKDIR/witness.wtns $WORKDIR/proof.json $WORKDIR/public.json
npx snarkjs groth16 prove $WORKDIR/circuit_final.zkey $WORKDIR/witness.wtns $WORKDIR/proof.json $WORKDIR/public.json

echo "finished: `date '+%y/%m/%d %H:%M:%S'`"