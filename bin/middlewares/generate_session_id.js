// Middleware function to generate session ids

const generateSessionId = () => {

    let chars = "abcdefghijklmnopqrstuvwxyz-+ABCDEFGHIJKLMNOP1234567890.:";
    let pass = "";
    for (let x = 0; x < 10; x++) {
        let i = Math.floor(Math.random() * chars.length);
        pass += chars.charAt(i);
    }
    return pass;
};

module.exports = generateSessionId;
