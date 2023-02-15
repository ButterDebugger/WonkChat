import { verifyToken } from "./auth.js";
import fs from "node:fs";
const roomRegex = /[a-z0-9_]*/g;

function socketConnection(io, socket) {
    socket.authorized = false;

    console.log("hello hello", socket.id);

    socket.once("auth", async (token) => {
        // Verify authorization
        if (typeof token !== "string") {
            socket.emit("rejected", {
                type: "no-token"
            });
            socket.disconnect();
            return;
        }

        var result = await verifyToken(token);
        if (!result.success) {
            socket.emit("rejected", {
                type: "stale-session"
            });
            socket.disconnect();
            return;
        }

        socket.authorized = true;
        socket.user = result.user;
        
        // Check if user is already connected
        if (io.wonk.userSocks.has(socket.user.id)) {
            socket.emit("rejected", {
                type: "already-connected"
            });
            socket.disconnect();
            return;
        }

        io.wonk.userSocks.set(socket.user.id, socket);

        // Add event handlers
        socketAuthorized(io, socket);

        // Emit authorized event
        socket.emit("authorized");
    });
    
    socket.on("disconnect", () => {
        console.log("bye bye", socket.id);
    });
}

function socketAuthorized(io, socket) {
    function updateMembers(room, iterator = () => {}) {
        var roomSockets = io.sockets.adapter.rooms.get(room);

        if (typeof roomSockets == "undefined") return;

        var members = Array.from(roomSockets).map(sockid => {
            var sock = io.sockets.sockets.get(sockid);
            var user = sock.user;
            var member = {
                username: user.username,
                color: user.color,
                discriminator: user.discriminator,
                new: false,
                left: false
            }

            iterator(sockid, member);

            return member;
        }).sort(); // TODO: sort by alphabetical order then by discriminator

        io.to(room).emit("updateMembers", {
            room: room,
            members: members
        });
    }

    function isValidRoomname(room) {
        if (typeof room !== "string") return false;
        if (!room.startsWith("#")) return false;
        var roomname = room.substring(1);
        if (
            roomname.length < 3 ||
            roomname.length > 16 ||
            roomname.replace(roomRegex, '').length !== 0
        ) return false;
        return true;
    }

    socket.on("joinRoom", (room) => {
        if (!isValidRoomname(room)) return;

        if (Array.from(socket.rooms).includes(room)) return;

        socket.join(room);

        socket.emit("joinedRoom", {
            room: room,
            description: ""
        });
        updateMembers(room, (sockid, member) => {
            if (sockid == socket.id) {
                member.new = true;
            }
        });
    });

    socket.on("leaveRoom", (room) => {
        if (!isValidRoomname(room)) return;

        if (!Array.from(socket.rooms).includes(room)) return;

        updateMembers(room, (sockid, member) => {
            if (sockid == socket.id) {
                member.left = true;
            }
        });
        socket.leave(room);
        socket.emit("leftRoom", {
            room: room
        });
    });

    socket.on("message", (data) => {
        if (typeof data !== "object" || data.constructor.name !== "Object") return;
        if (typeof data.content !== "string") return;
        if (!Array.isArray(data.attachments)) return;
        if (data.content.replace(/\s/g, "").length == 0) return;
        if (!isValidRoomname(data.room)) return;

        if (!Array.from(socket.rooms).includes(data.room)) return;

        data.attachments = data.attachments.filter(attachment => {
            return (
                /^attachments\/([0-9a-f]{24})\/([0-9a-zA-Z]{24})\/(.+)$/g.test(attachment) &&
                fs.existsSync(__dirname, attachment)
            );
        });

        io.to(data.room).emit("message", {
            content: data.content,
            author: {
                username: socket.user.username,
                color: socket.user.color
            },
            room: data.room,
            attachments: data.attachments
        });
    });
    
    socket.on("disconnecting", () => {
        socket.rooms.forEach(room => {
            if (room.startsWith("#")) {
                updateMembers(room, (sockid, member) => {
                    if (sockid == socket.id) {
                        member.left = true;
                    }
                });
            }
        })
    });
    
    socket.on("disconnect", () => {
        io.wonk.userSocks.delete(socket.user.id);
    });
}

function init(io) {
    // Declare variables
    io.wonk = {
        userSocks: new Map(),
        heartbeat: 5000,
        pingsLost: 4
    }

    // Start heartbeat loop
    setInterval(() => {
        io.wonk.userSocks.forEach((socket, id) => {
            if (typeof socket.heartbeat == "undefined") socket.heartbeat = 0;
            if (!socket.connected) {
                io.wonk.userSocks.delete(id);
                return;
            }

            socket.heartbeat += 1;
            if (socket.heartbeat > io.wonk.pingsLost) {
                socket.emit("rejected", {
                    type: "no-response"
                });
                socket.disconnect();
                return;
            }

            socket.emit("ping");

            if (socket.heartbeat == 1) {
                socket.once("pong", (data) => {
                    socket.heartbeat = 0;
    
                    // console.log(id, data);
                });
            }
        });
    }, io.wonk.heartbeat);

    // Add socket handlers
    io.on('connection', (socket) => {
        socketConnection(io, socket);
    });
}

export default init;
