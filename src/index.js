const http = require('http');
const HttpServerPcpMid = require('pcpjs/lib/mid/httpPcpServerMid');
const {
  Sandbox,
  toSandboxFun,
  toLazySandboxFun,
  FunNode
} = require('pcpjs/lib/pcp');
const _ = require('lodash');
const requestor = require('cl-requestor');
const {
  writeTxt,
  readTxt,
  exec
} = require('./util');

const requestJson = async (type, options, postData) => {
  const {
    body
  } = await requestor(type, {
    bodyParser: (body) => {
      return JSON.parse(body);
    }
  })(options, postData);
  return body;
};

const funcMapToSandbox = (m) => {
  if (typeof m === 'function') {
    // fill some useful tools
    m = m({
      _,
      requestor,
      requestJson
    });
  }
  for (let k in m) {
    let oldFun = m[k];
    m[k] = toSandboxFun((params, ...other) => {
      console.log(`call func=${k}, params=${JSON.stringify(params)}`);
      return oldFun(params, ...other);
    });
  }
  return m;
};

module.exports = ({
  port = 5435,
  headers,
  funcMaps,
  safeDirs,
  cmdDir
}) => {
  const pcpMid = HttpServerPcpMid(
    new Sandbox(
      _.assign({},
        ...([
          // default function map
          {
            requestJson: (params) => requestJson(...params),

            exec: (params) => {
              return exec(params[0], {
                cwd: cmdDir
              });
            },

            get: async (params) => {
              return _.get(...(await Promise.all(params)));
            },

            writeTxt: (params) => {
              const [filePath, txt] = params;
              if (_.findIndex(safeDirs, (safeDir) => filePath.startsWith(safeDir + '/')) === -1) {
                throw new Error(`no permission to write to ${filePath}`);
              }

              return writeTxt(filePath, txt);
            },

            readTxt: (params) => {
              const [filePath] = params;
              if (_.findIndex(safeDirs, (safeDir) => filePath.startsWith(safeDir + '/')) === -1) {
                throw new Error(`no permission to write to ${filePath}`);
              }

              return readTxt(filePath);
            }
          }
        ].concat(funcMaps)).map(funcMapToSandbox),

        {
          // TODO define map function
          // (map, list, handler)
          // handler (item, idx, list) => _
          // eg: (map, [1,2,3], (+, _, 1))
          map: toLazySandboxFun(async (params, attachment, pcs) => {
            const [list, fn] = params;
            // fn must be FunNode instance
            if (!(fn instanceof FunNode)) {
              throw new Error(`Expect function node, but get ${fn}`);
            }

            return Promise.all(_.map(await pcs.executePureCallAST(list, attachment), (item) => {
              // like curry, fn is a partitial function
              const handler = new FunNode(fn.funName, [item].concat(fn.params));
              return pcs.executePureCallAST(handler, attachment);
            }));
          }),
        }
      )
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
