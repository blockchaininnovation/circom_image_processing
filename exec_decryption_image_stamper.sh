#!/bin/bash

LOG_FILE="result/$1.log"

# 引数はファイル名(ex: white10x10_16x.bmp)
echo "start: $1"

# 画像データのサイズを取得
size=$(stat -c %s test/sampledata/"$1")

# circomファイル書き換え
sed -i "s/VAR/$size/" factor/test_decryption_image_stamper.circom

# jsファイル書き換え
sed -i "s/VAR/$1/" test/exec.js

/usr/bin/time -v ./zkbuild_groth16.sh test_decryption_image_stamper 2>&1 | tee $LOG_FILE
node test/exec.js 2>&1 | tee -a $LOG_FILE


sed -i "s/$size/VAR/" factor/test_decryption_image_stamper.circom
sed -i "s/$1/VAR/" test/exec.js

echo "finished: $1"