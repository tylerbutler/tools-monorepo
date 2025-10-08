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
        ["OS=='mac'", {
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "OTHER_CPLUSPLUSFLAGS": [
              "-stdlib=libc++",
              "-isystem /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/c++/v1"
            ]
          }
        }],
        ["OS!='win'", {
          "cflags_c": ["-std=c11"],
          "cflags_cc": ["-std=c++20", "-stdlib=libc++"]
        }]
      ]
    }
  ]
}
