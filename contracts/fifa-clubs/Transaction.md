uzo@DESKTOP-V1MEA7D:/mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/fifa-clubs$ stellar contract deploy   --wasm target/wasm32v1-none/release/club_minter.wasm   --network testnet   --source-account gamer
ℹ️  Simulating install transaction…
ℹ️  Signing transaction: f691bdf2fe97a50573429ce0b58672a606c223a2c89f2d15bd3624437a229f9b
🌎 Submitting install transaction…
ℹ️  Using wasm hash 48ba6daaff6163d0569716ffdf85927edefa86df3c5c30c798a83c1013878257
ℹ️  Simulating deploy transaction…
ℹ️  Transaction hash is 71e30526c1febcfb1cb4e0b80d572cc31fc4620af69385cf1993f80be1245596
🔗 https://stellar.expert/explorer/testnet/tx/71e30526c1febcfb1cb4e0b80d572cc31fc4620af69385cf1993f80be1245596
ℹ️  Signing transaction: 71e30526c1febcfb1cb4e0b80d572cc31fc4620af69385cf1993f80be1245596
🌎 Submitting deploy transaction…
🔗 https://lab.stellar.org/r/testnet/contract/CARU6CJJIY2HZPQEOOVVFZY5QO23NAGAUHCXJDHTD6PLRCXNC5Y43FH2
✅ Deployed!
CARU6CJJIY2HZPQEOOVVFZY5QO23NAGAUHCXJDHTD6PLRCXNC5Y43FH2
uzo@DESKTOP-V1MEA7D:/mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/fifa-clubs$ stellar contract deploy   --wasm target/wasm32v1-none/release/fifa_game.wasm   --network testnet   --source-account gamer
ℹ️  Simulating install transaction…
ℹ️  Signing transaction: ebcbecf323b6878bb562680ddc889ef8cf205184502aead6fd0d887efd3834f5
🌎 Submitting install transaction…
ℹ️  Using wasm hash d6770e2155a198a2fecc0d5774e37120d130bb75ba3301c0304dfd2f41108b56
ℹ️  Simulating deploy transaction…
ℹ️  Transaction hash is 82009e07cc16927d4a0067044cec4ae1992365758ef10c19629bf1be1ffe9903
🔗 https://stellar.expert/explorer/testnet/tx/82009e07cc16927d4a0067044cec4ae1992365758ef10c19629bf1be1ffe9903
ℹ️  Signing transaction: 82009e07cc16927d4a0067044cec4ae1992365758ef10c19629bf1be1ffe9903
🌎 Submitting deploy transaction…
🔗 https://lab.stellar.org/r/testnet/contract/CAJ6DMM56A3EMMRE4SUFEZDUIUSR6FIIOVQTNCLC5H65QQOJC324WB4B
✅ Deployed!
CAJ6DMM56A3EMMRE4SUFEZDUIUSR6FIIOVQTNCLC5H65QQOJC324WB4B
uzo@DESKTOP-V1MEA7D:/mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/fifa-clubs$ stellar contract invoke --id CAJ6DMM56A3EMMRE4SUFEZDUIUSR6FIIOVQTNCLC5H65QQOJC324WB4B -- initialize --admin GDH57EKXNNRKVNQ2JOCNQVXZP4LRJNAH64Z2OSPFSZYFZEDLVSLS536O  --club_contract CARU6CJJIY2HZPQEOOVVFZY5QO23NAGAUHCXJDHTD6PLRCXNC5Y43FH2
error: the following required arguments were not provided:
  --source-account <SOURCE_ACCOUNT>

Usage: stellar contract invoke --id <CONTRACT_ID> --source-account <SOURCE_ACCOUNT> -- <CONTRACT_FN_AND_ARGS>...

For more information, try '--help'.
uzo@DESKTOP-V1MEA7D:/mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/fifa-clubs$ stellar contract invoke --id CAJ6DMM56A3EMMRE4SUFEZDUIUSR6FIIOVQTNCLC5H65QQOJC324WB4B -- initialize --admin GDH57EKXNNRKVNQ2JOCNQVXZP4LRJNAH64Z2OSPFSZYFZEDLVSLS536O  --club_contract CARU6CJJIY2HZPQEOOVVFZY5QO23NAGAUHCXJDHTD6PLRCXNC5Y43FH2  --source-account gamer
error: the following required arguments were not provided:
  --source-account <SOURCE_ACCOUNT>

Usage: stellar contract invoke --id <CONTRACT_ID> --source-account <SOURCE_ACCOUNT> -- <CONTRACT_FN_AND_ARGS>...

For more information, try '--help'.
uzo@DESKTOP-V1MEA7D:/mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/fifa-clubs$ stellar contract invoke  --source-account gamer --id CAJ6DMM56A3EMMRE4SUFEZDUIUSR6FIIOVQTNCLC5H65QQOJC324WB4B -- initialize --admin GDH57EKXNNRKVNQ2JOCNQVXZP4LRJNAH64Z2OSPFSZYFZEDLVSLS536O  --club_contract CARU6CJJIY2HZPQEOOVVFZY5QO23NAGAUHCXJDHTD6PLRCXNC5Y43FH2
ℹ️  Signing transaction: 899a83d6193cfaaf0626df89698d60ee5948eb563d6c3d93e246ce685aea71d6
