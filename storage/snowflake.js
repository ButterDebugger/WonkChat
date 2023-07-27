const epoch = 1640995200000n; // First second of 2023
let sequence = 0n;

export const TypedId = {
    generate: function(type = null) {
        if (typeof type !== "bigint" || type < 0n || type >= 32n) throw new TypeError("Id type must be a bigint between 0 and 31.");
    
        let timestamp = BigInt(Date.now()) - epoch;
        let processId = BigInt(process.pid);
    
        // Constrain to a fixed length
        timestamp &= 0b111111111111111111111111111111111111111111n;
        processId &= 0b11111n;
        
        // Left shift the bits into alignment
        timestamp <<= 22n;
        type <<= 17n;
        processId <<= 12n;
    
        // Merge all the values together
        let id = timestamp | type | processId | sequence;
        
        // Increment the sequence
        sequence = (sequence + 1n) & 0b111111111111n;
    
        return intToBase36(id);
    },
    getTimestamp: function(id) {
        let int = base36ToInt(id);
        return parseInt((int >> 22n) + epoch);
    },
    getType: function(id) {
        let int = base36ToInt(id);
        return (int >> 17n) & 0b11111n;
    }
}

function intToBase36(number) {
    const baseChars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = (number > 0n) ? "" : "0";
    while (number > 0n) {
        result = baseChars[number % 36n] + result;
        number = number / 36n;
    }
    return result;
}

function base36ToInt(string) {
    const baseChars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let length = BigInt(string.length) - 1n;
    let result = 0n;
    for (let char of string) {
        result += BigInt(baseChars.indexOf(char)) * 36n ** length;
        length--;
    }
    return result;
}
