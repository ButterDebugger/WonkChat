# Table of contents

## Getting Started

* [💖 About Wonk Chat](README.md)
* [🔗 Official Links](getting-started/official-links.md)

## Objects

* [Error Codes](objects/codes.md)
* [Identifiers](objects/identifiers.md)

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
