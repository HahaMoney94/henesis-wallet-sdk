# core unit test
cd ./packages/core

npm run test

if [ $? -ne 0 ]; then
    echo "core unit test failed" >&2
    exit 1
fi
