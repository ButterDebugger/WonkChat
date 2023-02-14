module.exports = () => {
    require("dotenv").config();

    return {
        nameRegex: /[a-zA-Z0-9_]*/g,
        roomRegex: /[a-z0-9_]*/g
    };
}