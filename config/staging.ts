import { Config } from ".";
// @ts-ignore
import secret from "./secret";

const config: Config = {
    server: {
        port: 5000,
        domain: "staging.thepurplewarehouse.com",
    },
    db: secret.staging.db,
    auth: secret.staging.auth,
    features: ["scouting"]
};

export default config;
