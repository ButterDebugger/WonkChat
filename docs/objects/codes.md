## Request error codes

| Code | Message                  |
| :--: | ------------------------ |
| 101  | Invalid body             |
| 102  | Missing query string     |
| 103  | Missing files            |
| 104  | Invalid encrypted body   |
| 105  | Unknown endpoint         |
| 106  | Internal server error    |
| 107  | Unknown public key       |
| 108  | Request body is to large |

## Message error codes

| Code | Message                 |
| :--: | ----------------------- |
| 201  | Invalid message content |

## Room error codes

| Code | Message                                                |
| :--: | ------------------------------------------------------ |
| 301  | Invalid room name                                      |
| 302  | Already joined this room                               |
| 303  | Room doesn't exist                                     |
| 304  | Cannot send a message in a room that you are not in    |
| 305  | Room already exist                                     |
| 306  | Cannot leave a room that you are already not in        |
| 307  | Cannot query info about a room that you are not in     |
| 308  | Cannot create an invite for a room that you are not in |
| 309  | Invalid invite code                                    |

## User error codes

| Code | Message             |
| :--: | ------------------- |
| 401  | User does not exist |

## Authorization error codes

| Code | Message                                      |
| :--: | -------------------------------------------- |
| 501  | Invalid credentials                          |
| 502  | Too many requests                            |
| 503  | Invalid public key                           |
| 504  | Username has already been taken (Deprecated) |
| 505  | Login code has expired                       |
| 506  | Login code is invalid                        |
| 507  | User session does not exist                  |

## Stream error codes

| Code | Message                         |
| :--: | ------------------------------- |
| 601  | Could not find an active stream |
| 602  | Stream is currently inactive    |

## Media error codes

| Code | Message                                                 |
| :--: | ------------------------------------------------------- |
| 701  | File does not exist                                     |
| 702  | Filename does not match                                 |
| 703  | Upload does not exist or has been aborted by the server |
| 704  | Chunk has already been uploaded or is invalid           |
| 705  | Not all chunks have been uploaded                       |
| 706  | Completed file does not match the expected checksum     |
