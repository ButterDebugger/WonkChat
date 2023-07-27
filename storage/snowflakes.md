# Snowflakes

## Typed IDs

| Field      | Range    | Bits    | Description                                 |
|------------|----------|---------|---------------------------------------------|
| Timestamp  | 63 to 22 | 42 bits | Milliseconds since the first second of 2023 |
| Type       | 21 to 17 | 5 bits  | The type of the snowflake                   |
| Process ID | 16 to 12 | 5 bits  | The process ID of the server                |
| Sequence   | 11 to 0  | 12 bits | A number which increments for ID generation |

| Type | Description             |
|:----:|-------------------------|
| 0    | User session            |
| 1    | Attachment              |
