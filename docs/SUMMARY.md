# Table of contents

## Getting Started

* [💖 About Wonk Chat](README.md)
* [🔗 Official Links](getting-started/official-links.md)

## Group 1

* [Error Codes](group-1/codes.md)
* [Identifiers](group-1/identifiers.md)

## Routes

* ```yaml
  type: builtin:openapi
  props:
    models: true
  dependencies:
    spec:
      ref:
        kind: openapi
        spec: wonk-api-spec
  ```
