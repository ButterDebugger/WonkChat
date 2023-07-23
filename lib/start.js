import chalk from "chalk";
import http from "node:http";
import https from "node:https";

export default function start(handler, port = 3000, options = {}) {
    options = Object.assign({
        ssl: false,
        config: {},
        logListen: true,
        logClose: true,
        logErrors: true,
        logRequests: false,
        logResponses: false
    }, options);

    let server = (options.ssl ? https : http).createServer(options.config, handler).listen(port);

    if (options.logListen) {
        server.addListener("listening", () => {
            console.log(chalk.bgGreen.bold(" LISTENING "), chalk.white(`Running on port ${port}`));
        });
    }

    if (options.logClose) {
        server.addListener("close", () => {
            console.log(chalk.bgYellow.bold(" CLOSE "), chalk.white("Server has closed"));
        });
    }

    if (options.logErrors) {
        server.addListener("error", (err) => {
            console.error(chalk.bgRed.bold(" ERROR "), chalk.white("Server has encountered an error:"), err);
        });
    }

    if (options.logRequests || options.logResponses) {
        server.addListener("request", (req, res) => {
            let startTime = new Date();
            if (options.logRequests) {
                console.log(chalk.bgBlue.bold(` HTTP/${req.httpVersion} `), chalk.dim(formatDate(startTime)), chalk.yellow(req.ip), chalk.cyan(req.method, req.url));
            }

            if (options.logResponses) {
                res.once("close", () => {
                    let finishTime = new Date();
                    let handleTime = finishTime.getTime() - startTime.getTime();
                    console.log(chalk.bgBlue.bold(` HTTP/${req.httpVersion} `), chalk.dim(formatDate(finishTime)), chalk.yellow(req.ip), chalk[res.statusCode < 400 ? "green" : "red"](`Returned ${res.statusCode} in ${handleTime} ms`));
                });
            }
        });
    }

    return server;
}

function formatDate(date) {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
