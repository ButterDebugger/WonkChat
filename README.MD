# WonkChat

Just another simplistic and purely anonymous chat app for wonky fellows to chat in.

## Features

- **Anonymity**: Chat with others without revealing your identity.
- **Simplicity**: A straightforward interface for easy communication.
- **Real-time**: Instantly send and receive messages.

## Getting Started

If you wish to install and run WonkChat, follow these steps:
```sh
git clone https://github.com/ButterDebugger/WonkChat.git
cd WonkChat
git submodule update --init --recursive
sudo bash start.sh
```

When hosting, ensure that both the client and api servers are protected behind a firewall, only accessible through the reverse proxy.

> The client server is hosted on port 4030 and the api server is hosted on port 5000.

### Environment Variables
Declare the environment variables on your system or inside a file named `.env` in the root of the project's directory.
```env
PORT = <0 - 65535> (defaults to 80)
TOKEN_SECRET = <128 characters>
```

> At the moment, changing the port will require you to edit [`nginx.conf`](nginx.conf)

## License

WonkChat is licensed under [`MIT License`](LICENSE).
