const settingModel = require("../models/setting");
// const parseHTML = require("jquery-html-parser");
// const dvAxios = require("devergroup-request").default;
// const axios = new dvAxios({
//     axiosOpt: {
//         timeout: 30000
//     }
// });
const { keywordkegLog } = require("../services/logger");
const { get } = require("lodash");
const puppeteer = require("puppeteer-extra");

const login = async (req, res) => {
    let { email, password } = req.body;
    try {
        // let response = await axios.instance.get("https://app.keywordkeg.com/auth/login");
        // let $ = parseHTML(response.data);
        // let csrfToken = $("meta[name='csrf-token']").attr("content");
        // let body = `email=${email}&password=${password}&_csrf_token=${csrfToken}`;
        // response = await axios.instance.post(
        //     "https://app.keywordkeg.com/auth/login",
        //     body,
        //     {
        //         headers: {
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
        //             "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        //             "Content-Length": Buffer.byteLength(body),
        //             "Host": "app.keywordkeg.com"
        //         }
        //     }
        // );
        // $ = parseHTML(response.data);
        // let logout = $("[href='https://app.keywordkeg.com/auth/logout']").text();
        // if (logout.trim() == "Logout") {
        //     let cookie = axios.cookieJar.getCookieStringSync("https://app.keywordkeg.com");
        //     console.log("COOKIE===============>", cookie);
        //     await settingModel.findOneAndUpdate(null, {
        //         keywordkegCookie: cookie
        //     }, {
        //         upsert: true
        //     });
        //     keywordkegLog.info(`Start session with ${email} successfully.`);
        //     res.send('Login successfully.');
        // } else {
        //     res.status(500).send("Credential is incorrect.");
        // }
        const windowsLikePathRegExp = /[a-z]:\\/i;
        let inProduction = false;

        if (! windowsLikePathRegExp.test(__dirname)) {
            inProduction = true;
        }
        let options = {};
        if (inProduction) {
            options = {
                headless : true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--media-cache-size=0',
                    '--disk-cache-size=0',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                ],
                timeout: 100000,
            };
        } else {
            options = {
                headless : false,
                timeout: 100000,
                args: [
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                ],
            };
        }
        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        await page.goto('https://app.keywordkeg.com/auth/login', {waitUntil: 'load', timeout: 100000});
        await page.focus("input#input-email").then(async () => {
            await page.keyboard.type(email, { delpay: 100 });
        });
        await page.focus("input#input-password").then(async () => {
            await page.keyboard.type(password, { delpay: 100 });
        });
        await Promise.all([
            page.waitForNavigation({waitUntil: 'load', timeout : 100000}),
            page.click('form button')
        ]).then(async (result) => {
            if (/auth\/login/.test(page.url())) {
                keywordkegLog.error(`Start session with ${email} failed.`);
                res.status(500).send("Credential is incorrect.");
            } else {
                let cookies = await page.cookies();
                await browser.close(true);
                let cookie = "";
                for(let idx in cookies) {
                    cookie += cookies[idx].name + "=" + cookies[idx].value + "; ";
                }
                console.log(cookie);
                await settingModel.findOneAndUpdate(null, {
                    keywordkegCookie: cookie
                }, {
                    upsert: true
                });
                keywordkegLog.info(`Start session with ${email} successfully.`);
                res.send("Login successfully.");
            }
        });
    } catch (err) {
        keywordkegLog.error(`Start session with ${email} failed: ${get(err, "response.data.message") || err.toString()}`);
        res.status(500).send(get(err, "response.data.message") || err.toString());
    }
}

module.exports = {
    login
};