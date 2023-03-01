import { Config } from ".";

const config: Config = {
    server: {
        port: 5000,
        domain: "thepurplewarehouse.com",
    },
    db: {
        database: "tpw-dev",
        username: "",
        password: "",
        host: "localhost",
        port: 27017,
    },
    auth: {
        cookieKeys: ["1", "2", "3", "4", "I declare a thumb war"],
    },
    features: ["scouting"]
};

export default config;
