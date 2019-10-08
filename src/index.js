const http = require('http');
const HttpServerPcpMid = require('pcpjs/lib/mid/httpPcpServerMid');
const {
    Sandbox,
    toSandboxFun
} = require('pcpjs/lib/pcp');
const _ = require('lodash');

module.exports = ({
    port = 5435,
    headers,
    funcMaps
}) => {
    const pcpMid = HttpServerPcpMid(
        new Sandbox(
            _.assign({}, ...funcMaps.map(m => {
                for (let k in m) {
                    let oldFun = m[k];
                    m[k] = toSandboxFun((params, ...other) => {
                        console.log(`call func=${k}, params=${params}`);
                        return oldFun(params, ...other);
                    });
                }
                return m;
            }))
        ),

        headers
    );

    const server = http.createServer((req, res) => {
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
