# Test data files

## Updating compressed test files

To update the compressed test files if the test data files change, run the following commands from this path.

### tar

```shell
tar -cvzf ./test/data/tarball.tar.gz ./test/data/*.json
```

### zlib

```shell
python3 -c "import zlib; import sys; sys.stdout.buffer.write(zlib.compress(open('test0.json','rb').read(), level=9))" > test.zlib
```

### DEFLATE

```shell
python3 -c "import zlib; import sys; sys.stdout.buffer.write(zlib.compress(open('test0.json','rb').read(), level=9)[2:-4])" > test.deflate
```
