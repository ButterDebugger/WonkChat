# Snowflakes

| Field      | Range    | Bits    | Description                                 |
|------------|----------|---------|---------------------------------------------|
| Timestamp  | 63 to 22 | 42 bits | Milliseconds since the first second of 2023 |
| Process ID | 21 to 12 | 10 bits | The process ID of the server                |
| Sequence   | 11 to 0  | 12 bits | A number which increments for ID generation |

# Fingerprints

Created by hashing a users PGP public key with the SHA-256 algorithm.
