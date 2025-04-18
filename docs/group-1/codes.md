## Request error codes

| Code | Message                |
| :--: | ---------------------- |
| 101  | Invalid body           |
| 102  | Missing query string   |
| 103  | Missing files          |
| 104  | Invalid encrypted body |
| 105  | Unknown endpoint       |
| 106  | Internal server error  |
| 107  | Unknown public key     |

## Message error codes

| Code | Message                 |
| :--: | ----------------------- |
| 201  | Invalid message content |

## Room error codes

| Code | Message                                             |
| :--: | --------------------------------------------------- |
| 301  | Invalid room name                                   |
| 302  | Already joined this room                            |
| 303  | Room doesn't exist                                  |
| 304  | Cannot send a message in a room that you are not in |
| 305  | Room already exist                                  |
| 306  | Cannot leave a room that you are already not in     |
| 307  | Cannot query info about a room that you are not in  |

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
