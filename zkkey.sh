#!/bin/bash

# 作業ディレクトリの作成
WORKDIR=work/$1
mkdir -p $WORKDIR

echo "start: `date '+%y/%m/%d %H:%M:%S'`"

#トラステッドセットアップセレモニー．
#まずは回路を指定しない状態で鍵を生成する．
#MPCでやっていて参加者の中で一人でも信用できれば(全員が共謀していない限りは)OK．
# ここで得られる値(SRS)はほかのプロジェクトで作ったものを流用してもOK．
echo "1. Start a new powers of tau ceremony"
npx snarkjs powersoftau new bn128 $2 $WORKDIR/POT12_0.ptau -v

echo "2. Contribute to the ceremony"
npx snarkjs powersoftau contribute $WORKDIR/POT12_0.ptau $WORKDIR/POT12_1.ptau --name="First contribution" -v -e="some random text"
echo "3. Provide a second contribution"
npx snarkjs powersoftau contribute $WORKDIR/POT12_1.ptau $WORKDIR/POT12_2.ptau --name="Second contribution" -v -e="some random text"
echo "4. Provide a third contribution using third party software"
npx snarkjs powersoftau export challenge $WORKDIR/POT12_2.ptau $WORKDIR/challenge_0003
npx snarkjs powersoftau challenge contribute bn128 $WORKDIR/challenge_0003 $WORKDIR/response_0003 -e="some random text"
npx snarkjs powersoftau import response $WORKDIR/POT12_2.ptau $WORKDIR/response_0003 $WORKDIR/POT12_3.ptau -n="Third contribution name"
echo "5. Verify the protocol so far"
npx snarkjs powersoftau verify $WORKDIR/POT12_3.ptau

#ランダムビーコンの適用．
#一定時間が経過すると利用できないランダム性を持つ情報源．
#これは何を意味しているかよくわからず．
echo "6. Apply a random beacon"
npx snarkjs powersoftau beacon $WORKDIR/POT12_3.ptau $WORKDIR/POT12_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
echo "7. Prepare phase 2"
npx snarkjs powersoftau prepare phase2 $WORKDIR/POT12_beacon.ptau $WORKDIR/POT12_final.ptau -v
echo "8. Verify the final ptau"
npx snarkjs powersoftau verify $WORKDIR/POT12_final.ptau


echo "finished: `date '+%y/%m/%d %H:%M:%S'`"