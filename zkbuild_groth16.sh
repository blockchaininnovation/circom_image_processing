#!/bin/bash

# 作業ディレクトリの作成
WORKDIR=work/$1
mkdir -p $WORKDIR

start_time=$(date +%s%3N)
echo "start: `date '+%y/%m/%d %H:%M:%S'`  $start_time"

#回路はR1CSの形式で表現される．
echo "10. Compile the circuit"
circom factor/$1.circom --r1cs --wasm --sym --output $WORKDIR
# echo "11. View information about the circuit"
# npx snarkjs info -r $WORKDIR/$1.r1cs 

# echo "12. Print the constraints"
# npx snarkjs r1cs print $WORKDIR/$1.r1cs $WORKDIR/$1.sym

# echo "13. Export r1cs to json"
# npx snarkjs r1cs export json $WORKDIR/$1.r1cs $WORKDIR/$1.r1cs.json
# cat $WORKDIR/$1.r1cs.json


#回路を指定した，証明用の鍵と検証用の鍵の2つを生成．
echo "15. Setup"
# Gloth16
# npx snarkjs plonk setup $WORKDIR/$1.r1cs $WORKDIR/POT12_final.ptau $WORKDIR/circuit_final.zkey
npx --max-old-space-size=900000 snarkjs groth16 setup $WORKDIR/$1.r1cs $WORKDIR/POT12_final.ptau $WORKDIR/circuit_0000.zkey

# echo "16. Contribute to the phase 2 ceremony"
npx snarkjs zkey contribute $WORKDIR/circuit_0000.zkey $WORKDIR/circuit_0001.zkey --name="1st Contributor Name" -v -e="some random text"

# echo "17. Provide a second contribution"
npx snarkjs zkey contribute $WORKDIR/circuit_0001.zkey $WORKDIR/circuit_0002.zkey --name="Second contribution Name" -v -e="Another random entropy"

# echo "18. Provide a third contribution using third party software"
npx snarkjs zkey export bellman $WORKDIR/circuit_0002.zkey  $WORKDIR/challenge_phase2_0003
npx snarkjs zkey bellman contribute bn128 $WORKDIR/challenge_phase2_0003 $WORKDIR/response_phase2_0003 -e="some random text"
npx snarkjs zkey import bellman $WORKDIR/circuit_0002.zkey $WORKDIR/response_phase2_0003 $WORKDIR/circuit_0003.zkey -n="Third contribution name"

# echo "19. Verify the latest zkey"
npx snarkjs zkey verify $WORKDIR/$1.r1cs $WORKDIR/POT12_final.ptau $WORKDIR/circuit_0003.zkey

# echo "20. Apply a random beacon"
npx snarkjs zkey beacon $WORKDIR/circuit_0003.zkey $WORKDIR/circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"


# echo "21. Verify the final zkey"
# npx snarkjs zkey verify $WORKDIR/$1.r1cs $WORKDIR/POT12_final.ptau $WORKDIR/circuit_final.zkey

#検証用の鍵verification_key.json生成．
echo "22. Export the verification key"
npx snarkjs zkey export verificationkey $WORKDIR/circuit_final.zkey $WORKDIR/verification_key.json


finish_time=$(date +%s%3N)
echo "finished: `date '+%y/%m/%d %H:%M:%S'`  $finish_time"

execution_time_ms=$((finish_time - start_time))
echo "execution_time_ms: $execution_time_ms"
