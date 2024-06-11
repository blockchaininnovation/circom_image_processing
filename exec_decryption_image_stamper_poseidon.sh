#!/bin/bash

LOG_FILE="result/$1.poseidon.log"

# 引数はファイル名(ex: white10x10_16x.bmp)
echo "start: $1"

# circomファイル書き換え
sed -i "s/VARE/$2/" factor/test_decryption_image_stamper_poseidon.circom
sed -i "s/VARL/$3/" factor/test_decryption_image_stamper_poseidon.circom
sed -i "s/VARS/$4/" factor/test_decryption_image_stamper_poseidon.circom

# jsファイル書き換え
sed -i "s/VAR/$1/" test/exec_poseidon.js

# まずはteeに何もオプションをつけないことでログファイルがあっても上書き
/usr/bin/time -v ./zkbuild_groth16.sh test_decryption_image_stamper_poseidon 2>&1 | tee $LOG_FILE
# ここでは追記
node test/exec_poseidon.js 2>&1 | tee -a $LOG_FILE


sed -i "s/$2/VARE/" factor/test_decryption_image_stamper_poseidon.circom
sed -i "s/$3/VARL/" factor/test_decryption_image_stamper_poseidon.circom
sed -i "s/$4/VARS/" factor/test_decryption_image_stamper_poseidon.circom
sed -i "s/$1/VAR/" test/exec_poseidon.js

echo "finished: $1"