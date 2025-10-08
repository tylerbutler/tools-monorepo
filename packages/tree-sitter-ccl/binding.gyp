{
  "targets": [
    {
      "target_name": "tree_sitter_ccl_binding",
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ],
      "include_dirs": [
        "src"
      ],
      "sources": [
        "bindings/node/binding.cc",
        "src/parser.c",
        "src/scanner.cc"
      ],
      "cflags_c": [
        "-std=c11"
      ],
      "cflags_cc": [
        "-std=c++20"
      ],
      "conditions": [
        ["OS!='win'", {
          "cflags_c": ["-std=c11"]
        }]
      ]
    }
  ]
}
