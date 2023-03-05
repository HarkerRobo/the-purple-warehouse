import Koa from "koa";
import Router from "koa-router";
import json from "koa-json";
import logger from "koa-logger";
import views from "koa-views";
import bodyParser from "koa-bodyparser";
import serve from "koa-static";
import session from "koa-session";
import auth from "koa-basic-auth";
import { createServer } from "http";
import * as crypto from "crypto";

import registerHelpers from "./helpers/hbsHelpers";

import config from "./config";
import { registerComponentsWithinDirectory } from "./helpers/componentRegistration";

import loginRouter from "./routers/login"; // contains base route "/"
import defaultRouter from "./routers/default"; // contains base route "/"
import scoutingDefaultRouter from "./routers/scoutingDefault"; // contains base route "/"
import resourcesRouter from "./routers/resources";
import resourcesAPIRouter from "./routers/api/resources";
import scoutingRouter from "./routers/scouting";
import scoutingAPIRouter from "./routers/api/scouting";

const app = new Koa();

const sessionConfig: Partial<session.opts> = {
    key: config.auth.cookieKeys[0],
    maxAge: 1000 * 60 * 60 * 24 * 3 // 3 days
};

app.keys = config.auth.cookieKeys.slice(1);
app.use(session(sessionConfig, app));
app.use(json());
app.use(logger());
app.use(bodyParser());
app.use(
    views(__dirname + (__dirname.endsWith("build") ? "/../views" : "/views"), {
        map: {
            hbs: "handlebars"
        },
        extension: "hbs"
    })
);

async function handleAuthenticate(ctx, next) {
    try {
        await next();
    } catch (err) {
        if (err.status === 401) {
            ctx.status = 401;
            ctx.set("WWW-Authenticate", "Basic");
            ctx.body = "Unauthorized";
        } else {
            throw err;
        }
    }
}
app.use(async (ctx, next) => {
    try {
        if (
            ctx.request.url.toString() == "/update" &&
            ctx.request.header["user-agent"].toLowerCase().includes("github")
        ) {
            let requestHash = Buffer.from(
                ctx.request.header["x-hub-signature-256"].toString(),
                "utf8"
            );
            let verifyHash = Buffer.from(
                `sha256=${crypto
                    .createHmac("sha256", config.auth.ci.deploy)
                    .update(ctx.request.rawBody)
                    .digest("hex")}`,
                "utf8"
            );
            if (crypto.timingSafeEqual(requestHash, verifyHash)) {
                if (ctx.request.body.ref == `refs/heads/${config.branch}`) {
                    ctx.body = "";
                    process.exit(0);
                }
            }
            ctx.body = "";
        } else {
            await handleAuthenticate(ctx, next);
        }
    } catch (err) {
        await handleAuthenticate(ctx, next);
    }
});

if (config.auth.access.restricted) {
    app.use(
        auth({
            name: config.auth.access.username,
            pass: config.auth.access.password
        })
    );
}

registerHelpers();
registerComponentsWithinDirectory("./views/partials");

const router = new Router<Koa.DefaultState, Koa.Context>();
router.use("", loginRouter.routes());
if (config.features.includes("resources")) {
    router.use("/app", resourcesRouter.routes());
    router.use("/api/v1/resources", resourcesAPIRouter.routes());
} else if (config.features.includes("scouting")) {
    router.use("/", scoutingDefaultRouter.routes());
} else {
    router.use("/", defaultRouter.routes());
}
if (config.features.includes("scouting")) {
    router.use("/scouting", scoutingRouter.routes());
    router.use("/api/v1/scouting", scoutingAPIRouter.routes());
}

router.get("/", async (ctx, next) => {
    await ctx.render("index");
});

app.use(router.routes());
app.use(serve("./static", {}));

const httpServer = createServer(app.callback());

httpServer.listen(config.server.port, () => {
    console.log(
        "Listening at http://" + config.server.domain + ":" + config.server.port
    );
});