### Setup

### Install Rust
First, you need a Rust environment. If you don't have it yet, install it with:

```
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

Then, add Rust to your PATH. 
Add the following to your .bash_profile or .bash_rc:
```
export PATH="$HOME/.cargo/bin:$PATH"
```
Don't forget to source it.


#### Install circom
Build and install from source:

```
cd ..
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

#### Install npm packages
```
npm install
```

#### Project setup
Get git submodules:

```
git submodule update --init --recursive
```

Modify the necessary include files in circom-chacha20:

Update the includes in circom-chacha20/circuits/aes/helper_functions.circom as follows:
```
include "../../../node_modules/circomlib/circuits/bitify.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
```

Update the includes in poseidon-encryption-circom2/circom/poseidon.circom as follows:
```
include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/escalarmulany.circom";
```

### Run scripts

If you haven't performed the Trusted setup, do it first. 
Depending on the size of the image to be processed, the number of constraints should be at least 2^20.
```
./zkkey.sh somedir 20
```

Modify exec.sh as needed and run it:
```
./exec.sh
```
