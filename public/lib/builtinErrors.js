export const errorCodes = Object.freeze({
	// Request error codes
	InvalidBody: 101,
	MissingQueryString: 102,
	MissingFiles: 103,
	InvalidEncryptedBody: 104,

	// Message error codes
	InvalidMessageContent: 201,

	// Room error codes
    InvalidRoomName: 301,
    AlreadyJoinedRoom: 302,
	RoomDoesNotExist: 303,
	SentMessageOutsideRoom: 304,
	RoomAlreadyExists: 305,
	AlreadyLeftRoom: 306,
	QueriedInfoOutsideRoom: 307,
	
	// User error codes
    UserDoesNotExist: 401,

	// Authorization error codes
	InvalidCredentials: 501,
	TooManyRequests: 502,
	InvalidPublicKey: 503,
	LoginExpired: 505,
	LoginInvalid: 506,
	
	// Stream error codes
	MissingStream: 601,
	StreamDisconnected: 602
});

export class ClientError extends Error {
	constructor(data, cause) {
		super(data.message);

		this.code = data.code;
		this.name = "ClientError";
		this.cause = cause;
	}
}