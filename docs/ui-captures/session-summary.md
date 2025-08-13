ok, cool, there are two minor observations:

1) mainfest has incorrect absolute path instead of the internal archieve path. For e.g. I have uploaded this folder ('test' which has 2 files)
├── test
   ├── hello-world 2.txt
   └── hello-world.txt

but the mainifest file generated is

{
  "vault_info": {
    "created": "2025-08-13T18:30:56.195772Z",
    "encrypted_file": "encrypted_20250813_183056.age",
    "total_files": 2,
    "vault_size": "408 B"
  },
  "contents": [
    {
      "file": "/var/folders/93/cbvxkv397slby830f5zdx4zc0000gn/T/.tmpoZOCPq/test/hello-world.txt",
      "size": "12 B"
    },
    {
      "file": "/var/folders/93/cbvxkv397slby830f5zdx4zc0000gn/T/.tmpoZOCPq/test/hello-world 2.txt",
      "size": "12 B"
    }
  ],
  "encryption": {
    "method": "Age encryption",
    "key_label": "sam-family-vault",
    "public_key": "age16alp98eqm9mj60qkav309ncml5ck86cltxsrasjr3pr7sg9e7f7qumuwvy"
  }
}

2) I am thinking, shouldnt the manifest also have the sha256 hash of the original contents in it?