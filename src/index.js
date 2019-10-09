const http = require('http');
const HttpServerPcpMid = require('pcpjs/lib/mid/httpPcpServerMid');
const {
    Sandbox,
    toSandboxFun
} = require('pcpjs/lib/pcp');
const _ = require('lodash');
const requestor = require('cl-requestor');
const spawnp = require('spawnp');

const funcMapToSandbox = (m) => {
    if (typeof m === 'function') {
        // fill some useful tools
        m = m({
            _,
            requestor,
            spawnp
        });
    }
    for (let k in m) {
        let oldFun = m[k];
        m[k] = toSandboxFun((params, ...other) => {
            console.log(`call func=${k}, params=${params}`);
            return oldFun(params, ...other);
        });
    }
    return m;
};

module.exports = ({
    port = 5435,
    headers,
    funcMaps
}) => {
    const pcpMid = HttpServerPcpMid(
        new Sandbox(
            _.assign({}, ...funcMaps.map(funcMapToSandbox))
        )
    );

    const server = http.createServer((req, res) => {
        for (let k in headers) {
            res.setHeader(k, headers[k]);
        }

        if (req.method === 'OPTIONS') {
            res.setHeader('Allow', 'OPTIONS, GET, HEAD, POST');
            res.end();
            return;
        }
        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        if (req.url === '/api/pcp') {
            pcpMid(req, res);
        } else {
            res.end('not supported api.');
        }
    });

    server.listen(port);

    const addr = server.address();
    console.log(`server started at ${addr.address}:${addr.port}`);
};
